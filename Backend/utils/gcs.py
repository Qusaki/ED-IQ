import os
import re
import tempfile
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import UploadFile, HTTPException
from google.cloud import storage
from google.cloud.exceptions import NotFound

# Load environment variables from .env file
load_dotenv()

# Get environment variables
PROJECT_ID = os.getenv("GCP_PROJECT_ID")
BUCKET_NAME = os.getenv("GCP_BUCKET_NAME")
CREDENTIALS_JSON = os.getenv("GCP_CREDENTIALS_JSON")

if not PROJECT_ID or not BUCKET_NAME:
    raise ValueError(
        "GCP_PROJECT_ID and GCP_BUCKET_NAME environment variables must be set"
    )

# Initialize GCS client
if CREDENTIALS_JSON and os.path.exists(CREDENTIALS_JSON):
    storage_client = storage.Client.from_service_account_json(CREDENTIALS_JSON)
else:
    storage_client = storage.Client(project=PROJECT_ID)

bucket = storage_client.bucket(BUCKET_NAME)

# File validation constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    'images': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    'documents': ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.rtf'],
    'videos': ['.mp4', '.avi', '.mov', '.wmv', '.flv'],
    'audio': ['.mp3', '.wav', '.flac', '.aac']
}
ALL_ALLOWED_EXTENSIONS = [ext for exts in ALLOWED_EXTENSIONS.values() for ext in exts]


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to be safe for GCS storage.
    
    Args:
        filename: Original filename
        
    Returns:
        str: Sanitized filename
    """
    # Remove or replace unsafe characters
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    # Remove multiple consecutive underscores
    filename = re.sub(r'_+', '_', filename)
    # Remove leading/trailing underscores and dots
    filename = filename.strip('_.')
    return filename


def validate_file(file: UploadFile, max_size: int = MAX_FILE_SIZE, 
                 allowed_extensions: Optional[List[str]] = None) -> None:
    """
    Validate uploaded file.
    
    Args:
        file: FastAPI UploadFile object
        max_size: Maximum file size in bytes
        allowed_extensions: List of allowed file extensions
        
    Raises:
        HTTPException: If validation fails
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file size
    if hasattr(file, 'size') and file.size and file.size > max_size:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
        )
    
    # Check file extension
    if allowed_extensions:
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
            )


def upload_file_to_gcs(file: UploadFile, destination_name: str, 
                      validate: bool = True, make_public: bool = True) -> str:
    """
    Upload a file to Google Cloud Storage.
    
    Args:
        file: FastAPI UploadFile object
        destination_name: Path/name for the file in GCS bucket
        validate: Whether to validate file (size, type)
        make_public: Whether to make the uploaded file public
        
    Returns:
        str: Public URL of the uploaded file
        
    Raises:
        HTTPException: If upload fails
    """
    temp_file_path = None
    try:
        # Validate inputs
        if validate:
            validate_file(file, allowed_extensions=ALL_ALLOWED_EXTENSIONS)
            
        if not destination_name or not destination_name.strip():
            raise HTTPException(status_code=400, detail="Invalid destination name")
        
        # Sanitize destination name
        destination_name = sanitize_filename(destination_name)

        blob = bucket.blob(destination_name)

        # Save file temporarily before uploading
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file_path = temp_file.name

            # Reset file pointer to the beginning and copy content
            file.file.seek(0)
            while chunk := file.file.read(1024 * 1024):  # Read in chunks of 1MB
                temp_file.write(chunk)
            temp_file.flush()

        # Upload to GCS
        blob.upload_from_filename(temp_file_path)

        # Clean up temporary file
        os.unlink(temp_file_path)

        # Make file public if requested
        if make_public:
            blob.make_public()

        # Reset file pointer for potential reuse
        file.file.seek(0)

        return blob.public_url
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        # Clean up temporary file if it exists
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to upload file to GCS: {str(e)}"
        )


def extract_filename_from_url(url: str) -> str:
    """
    Extract filename from GCS public URL.
    
    Args:
        url: GCS public URL
        
    Returns:
        str: Extracted filename/path
    """
    if not url:
        return ""
    
    # Extract from URL like: https://storage.googleapis.com/bucket-name/path/file.ext
    try:
        parts = url.split(f'/{BUCKET_NAME}/')
        if len(parts) > 1:
            return parts[1]
    except Exception:
        pass
    
    # Fallback: just get the last part after the last slash
    return url.split('/')[-1]


def delete_file_from_gcs(file_name: str) -> bool:
    """
    Delete a file from Google Cloud Storage.
    
    Args:
        file_name: The name/path of the file to delete in GCS
        
    Returns:
        bool: True if deletion succeeded, False if file didn't exist
        
    Raises:
        HTTPException: For validation errors or GCS errors
    """
    try:
        # Validate file name
        if not file_name or not file_name.strip():
            raise HTTPException(status_code=400, detail="File name cannot be empty")
            
        blob = bucket.blob(file_name)
        
        # Check if file exists before attempting deletion
        if not blob.exists():
            return False
            
        blob.delete()
        return True
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except NotFound:
        return False  # File doesn't exist
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file '{file_name}' from GCS: {str(e)}"
        )


def get_file_url_from_gcs(file_name: str) -> str:
    """
    Get the public URL of a file in GCS.
    
    Args:
        file_name: The name/path of the file in GCS
        
    Returns:
        str: The public URL of the file
        
    Raises:
        HTTPException: If file name is invalid
    """
    if not file_name or not file_name.strip():
        raise HTTPException(status_code=400, detail="File name cannot be empty")
        
    blob = bucket.blob(file_name)
    return blob.public_url


def file_exists_in_gcs(file_name: str) -> bool:
    """
    Check if a file exists in Google Cloud Storage.
    
    Args:
        file_name: The name/path of the file to check
        
    Returns:
        bool: True if file exists, False otherwise
    """
    if not file_name or not file_name.strip():
        return False
        
    try:
        blob = bucket.blob(file_name)
        return blob.exists()
    except Exception:
        return False


def get_file_metadata(file_name: str) -> dict:
    """
    Get metadata for a file in GCS.
    
    Args:
        file_name: The name/path of the file in GCS
        
    Returns:
        dict: File metadata including size, content_type, created time
        
    Raises:
        HTTPException: If file doesn't exist or error occurs
    """
    try:
        if not file_name or not file_name.strip():
            raise HTTPException(status_code=400, detail="File name cannot be empty")
            
        blob = bucket.blob(file_name)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found")
            
        blob.reload()  # Fetch latest metadata
        
        return {
            'name': blob.name,
            'size': blob.size,
            'content_type': blob.content_type,
            'created': blob.time_created.isoformat() if blob.time_created else None,
            'updated': blob.updated.isoformat() if blob.updated else None,
            'public_url': blob.public_url,
            'md5_hash': blob.md5_hash
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get metadata for '{file_name}': {str(e)}"
        )

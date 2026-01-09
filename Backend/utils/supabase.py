import os
import re
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile
from supabase import Client, create_client

# Load environment variables from .env file
load_dotenv()

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET")

if not all([SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET]):
    raise EnvironmentError("One or more Supabase environment variables are missing.")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# File validation constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    "images": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"],
    "documents": [
        ".pdf",
        ".doc",
        ".docx",
        ".ppt",
        ".pptx",
        ".xls",
        ".xlsx",
        ".txt",
        ".rtf",
    ],
    "videos": [".mp4", ".avi", ".mov", ".wmv", ".flv"],
    "audio": [".mp3", ".wav", ".flac", ".aac"],
}
ALL_ALLOWED_EXTENSIONS = [ext for exts in ALLOWED_EXTENSIONS.values() for ext in exts]


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to be safe for Supabase storage.

    Args:
        filename: Original filename

    Returns:
        str: Sanitized filename
    """
    # Remove or replace unsafe characters
    filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    # Remove multiple consecutive underscores
    filename = re.sub(r"_+", "_", filename)
    # Remove leading/trailing underscores and dots
    filename = filename.strip("_.")
    return filename


def validate_file(
    file: UploadFile,
    max_size: int = MAX_FILE_SIZE,
    allowed_extensions: Optional[List[str]] = None,
) -> None:
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
    if hasattr(file, "size") and file.size and file.size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size // (1024 * 1024)}MB",
        )

    # Check file extension
    if allowed_extensions:
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}",
            )


def upload_file_to_supabase(
    file: UploadFile,
    destination_name: str,
    validate: bool = True,
    make_public: bool = True,
) -> str:
    """
    Upload a file to Supabase Storage.

    Args:
        file: FastAPI UploadFile object
        destination_name: Path/name for the file in Supabase bucket
        validate: Whether to validate file (size, type)
        make_public: Whether to make the uploaded file public

    Returns:
        str: Public URL of the uploaded file

    Raises:
        HTTPException: If upload fails
    """
    try:
        # Validate inputs
        if validate:
            validate_file(file, allowed_extensions=ALL_ALLOWED_EXTENSIONS)

        if not destination_name or not destination_name.strip():
            raise HTTPException(status_code=400, detail="Invalid destination name")

        # Sanitize destination name
        destination_name = sanitize_filename(destination_name)

        # Reset file pointer to the beginning
        file.file.seek(0)

        # Read file content
        file_content = file.file.read()

        # Upload to Supabase Storage
        response = supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=destination_name,
            file=file_content,
            file_options={"content-type": file.content_type}
            if file.content_type
            else {},
        )

        # Check if upload was successful
        if hasattr(response, "error") and response.error:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload file to Supabase: {response.error}",
            )

        # Reset file pointer for potential reuse
        file.file.seek(0)

        # Get public URL
        public_url = get_file_url_from_supabase(destination_name)

        return public_url

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to upload file to Supabase: {str(e)}"
        )


def extract_filename_from_url(url: str) -> str:
    """
    Extract filename from Supabase public URL.

    Args:
        url: Supabase public URL

    Returns:
        str: Extracted filename/path
    """
    if not url:
        return ""

    # Extract from URL like: https://[project].supabase.co/storage/v1/object/public/bucket-name/path/file.ext
    try:
        parts = url.split(f"/object/public/{SUPABASE_BUCKET}/")
        if len(parts) > 1:
            return parts[1]
    except Exception:
        pass

    # Fallback: just get the last part after the last slash
    return url.split("/")[-1]


def delete_file_from_supabase(file_name: str) -> bool:
    """
    Delete a file from Supabase Storage.

    Args:
        file_name: The name/path of the file to delete in Supabase

    Returns:
        bool: True if deletion succeeded, False if file didn't exist

    Raises:
        HTTPException: For validation errors or Supabase errors
    """
    try:
        # Validate file name
        if not file_name or not file_name.strip():
            raise HTTPException(status_code=400, detail="File name cannot be empty")

        # Check if file exists before attempting deletion
        if not file_exists_in_supabase(file_name):
            return False

        # Delete from Supabase Storage
        response = supabase.storage.from_(SUPABASE_BUCKET).remove([file_name])

        # Check if deletion was successful
        if hasattr(response, "error") and response.error:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete file from Supabase: {response.error}",
            )

        return True

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file '{file_name}' from Supabase: {str(e)}",
        )


def get_file_url_from_supabase(file_name: str) -> str:
    """
    Get the public URL of a file in Supabase Storage.

    Args:
        file_name: The name/path of the file in Supabase

    Returns:
        str: The public URL of the file

    Raises:
        HTTPException: If file name is invalid
    """
    if not file_name or not file_name.strip():
        raise HTTPException(status_code=400, detail="File name cannot be empty")

    try:
        # Get public URL from Supabase Storage
        response = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(file_name)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get file URL from Supabase: {str(e)}"
        )


def file_exists_in_supabase(file_name: str) -> bool:
    """
    Check if a file exists in Supabase Storage.

    Args:
        file_name: The name/path of the file to check

    Returns:
        bool: True if file exists, False otherwise
    """
    if not file_name or not file_name.strip():
        return False

    try:
        # List files to check existence
        response = supabase.storage.from_(SUPABASE_BUCKET).list(
            path=os.path.dirname(file_name) or ""
        )

        if hasattr(response, "error") and response.error:
            return False

        # Get base filename
        base_name = os.path.basename(file_name)

        # Check if file is in the list
        for item in response:
            if item.get("name") == base_name:
                return True

        return False
    except Exception:
        return False


def get_file_metadata(file_name: str) -> dict:
    """
    Get metadata for a file in Supabase Storage.

    Args:
        file_name: The name/path of the file in Supabase

    Returns:
        dict: File metadata including size, content_type, created time, and extracted filename

    Raises:
        HTTPException: If file doesn't exist or error occurs
    """
    try:
        if not file_name or not file_name.strip():
            raise HTTPException(status_code=400, detail="File name cannot be empty")

        if not file_exists_in_supabase(file_name):
            raise HTTPException(status_code=404, detail="File not found")

        # List files to get metadata
        response = supabase.storage.from_(SUPABASE_BUCKET).list(
            path=os.path.dirname(file_name) or ""
        )

        if hasattr(response, "error") and response.error:
            raise HTTPException(
                status_code=500, detail=f"Failed to get metadata: {response.error}"
            )

        # Get base filename
        base_name = os.path.basename(file_name)
        
        # Extract the last part of the filename after the last underscore
        original_name = base_name.split('_')[-1] if '_' in base_name else base_name

        # Find the file in the list
        for item in response:
            if item.get("name") == base_name:
                return {
                    "name": item.get("name"),
                    "original_name": original_name,  # Add the extracted filename
                    "id": item.get("id"),
                    "size": item.get("metadata", {}).get("size"),
                    "content_type": item.get("metadata", {}).get("mimetype"),
                    "created": item.get("created_at"),
                    "updated": item.get("updated_at"),
                    "public_url": get_file_url_from_supabase(file_name),
                    "last_accessed": item.get("last_accessed_at"),
                }

        raise HTTPException(status_code=404, detail="File not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get metadata for '{file_name}': {str(e)}",
        )

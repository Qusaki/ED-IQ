import os
import tempfile
from typing import Optional

from dotenv import load_dotenv
from fastapi import UploadFile
from google.cloud import storage

# Load environment variables from .env file
load_dotenv()

# Get environment variables
PROJECT_ID = os.getenv("GCP_PROJECT_ID")
BUCKET_NAME = os.getenv("GCP_BUCKET_NAME")
CREDENTIALS_JSON = os.getenv("GCP_CREDENTIALS_JSON")

if not PROJECT_ID or not BUCKET_NAME:
    raise ValueError("GCP_PROJECT_ID and GCP_BUCKET_NAME environment variables must be set")

# Initialize GCS client
if CREDENTIALS_JSON and os.path.exists(CREDENTIALS_JSON):
    storage_client = storage.Client.from_service_account_json(CREDENTIALS_JSON)
else:
    storage_client = storage.Client(project=PROJECT_ID)

bucket = storage_client.bucket(BUCKET_NAME)

def upload_file_to_gcs(file: UploadFile, destination_name: str) -> str:
    try:
        blob = bucket.blob(destination_name)

        # Save file temporarily before uploading
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = file.file.read()
            temp_file.write(content)
            temp_file.flush()

        # Upload to GCS
        blob.upload_from_filename(temp_file.name)

        # Clean up temporary file
        os.unlink(temp_file.name)

        # Make file public
        blob.make_public()

        return blob.public_url
    except Exception as e:
        # Clean up temporary file if it exists
        if 'temp_file' in locals():
            try:
                os.unlink(temp_file.name)
            except OSError:
                pass
        raise e
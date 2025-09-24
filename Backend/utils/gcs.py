import os
import tempfile
from google.cloud import storage
from fastapi import UploadFile
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

# get environment variables
PROJECT_ID = os.getenv("GCP_PROJECT_ID")
BUCKET_NAME = os.getenv("GCP_BUCKET_NAME")
CREDENTIALS_JSON = os.getenv("GCP_CREDENTIALS_JSON")

# initialize GCS client
if CREDENTIALS_JSON and os.path.exists(CREDENTIALS_JSON):
    storage_client = storage.Client.from_service_account_json(CREDENTIALS_JSON)
else:
    storage_client = storage.Client(project=PROJECT_ID)

bucket = storage_client.bucket(BUCKET_NAME)

def upload_file_to_gcs(file: UploadFile, destination_name: str) -> str:
    """ Upload a file to Google Cloud Storage and return the public URL. """
    blob = bucket.blob(destination_name)

    # save file temporarily before uploading
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(file.file.read())
        temp_file.flush()

    blob.upload_from_filename(temp_file.name)

    # make file public
    blob.make_public()

    return blob.public_url
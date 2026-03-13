from fastapi import APIRouter
from utils.chatbot import student_handbook
from utils.supabase import get_file_metadata


router = APIRouter()

from pydantic import BaseModel

class ChatMessage(BaseModel):
    message: str

@router.post("/handbook")
async def handbook_chatbot(payload: ChatMessage):
    response = student_handbook(payload.message)
    return {"response": response}
    


@router.post("/metadata")
async def get_filedata(file: str):
    # Get the metadata from Supabase
    metadata = get_file_metadata(file)
    
    # The original_name is already extracted in get_file_metadata
    # No need to modify it here as it's already in the response
    
    return {
        "original_name": metadata.get("original_name"),
        "size": metadata.get("size"),
        "content_type": metadata.get("content_type"),
        "created": metadata.get("created"),
        "public_url": metadata.get("public_url")
    }
from fastapi import APIRouter, Depends, HTTPException
from utils.chatbot import student_handbook
from utils.supabase import get_file_metadata
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from dependencies import get_current_user
import datetime


router = APIRouter()

from pydantic import BaseModel

class ChatMessage(BaseModel):
    message: str

@router.post("/handbook")
async def handbook_chatbot(
    payload: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.date.today()
    if current_user.last_chatbot_request_date != today:
        current_user.chatbot_requests_today = 0
        current_user.last_chatbot_request_date = today
        
    if current_user.chatbot_requests_today >= 3:
        raise HTTPException(
            status_code=429,
            detail="You have reached your limit of 3 requests for today. Please try again tomorrow."
        )
        
    current_user.chatbot_requests_today += 1
    db.commit()

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
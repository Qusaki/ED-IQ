from fastapi import APIRouter, Depends, HTTPException
from utils.chatbot import student_handbook
from utils.supabase import get_file_metadata


router = APIRouter()

from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models.user import User
from models.chat_usage import ChatUsage
from datetime import date

class ChatMessage(BaseModel):
    message: str

@router.get("/usage")
async def get_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    usage = db.query(ChatUsage).filter(
        ChatUsage.user_id == current_user.id,
        ChatUsage.usage_date == today
    ).first()
    
    return {"count": usage.count if usage else 0, "limit": 3}

@router.post("/handbook")
async def handbook_chatbot(
    payload: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    usage = db.query(ChatUsage).filter(
        ChatUsage.user_id == current_user.id,
        ChatUsage.usage_date == today
    ).first()

    if not usage:
        usage = ChatUsage(user_id=current_user.id, usage_date=today, count=0)
        db.add(usage)
        db.commit()
        db.refresh(usage)

    if usage.count >= 3:
        raise HTTPException(
            status_code=429, 
            detail="You've reached your daily limit of 3 chatbot questions. Please try again tomorrow!"
        )

    # Increment count before processing response to be safe
    usage.count += 1
    db.commit()

    response = student_handbook(payload.message)
    return {"response": response, "count": usage.count}
    


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
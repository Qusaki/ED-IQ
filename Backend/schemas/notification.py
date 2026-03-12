from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    subject_id: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    is_read: bool
    subject_id: Optional[str] = None
    activity_id: Optional[str] = None
    lecture_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
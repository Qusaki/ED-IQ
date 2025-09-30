from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ActivityBase(BaseModel):
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None


class ActivityCreate(ActivityBase):
    subject_id: str


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None


class ActivityResponse(ActivityBase):
    id: str
    teacher_id: str
    subject_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
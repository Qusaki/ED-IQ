from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class SubmissionBase(BaseModel):
    content: Optional[str] = None
    file_url: Optional[str] = None


class ActivityUpdate(BaseModel):
    content: Optional[str] = None
    file_url: Optional[str] = None


class SubmissionResponse(SubmissionBase):
    id: str
    student_id: str
    activity_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
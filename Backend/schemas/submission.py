from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SubmissionBase(BaseModel):
    content: Optional[str] = None
    file_url: Optional[str] = None


class SubmissionUpdate(BaseModel):
    content: Optional[str] = None
    file_url: Optional[str] = None


class SubmissionResponse(SubmissionBase):
    id: str
    student_id: str
    activity_id: str
    created_at: datetime
    updated_at: datetime
    score: Optional[int] = None

    class Config:
        from_attributes = True

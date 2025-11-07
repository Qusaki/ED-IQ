from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ActivityBase(BaseModel):
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    max_score: int


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    max_score: int


class ActivityResponse(ActivityBase):
    id: str
    teacher_id: str
    subject_id: str
    created_at: datetime
    updated_at: datetime
    max_score: int

    class Config:
        from_attributes = True

from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class LectureBase(BaseModel):
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None



class LectureUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None


class LectureResponse(LectureBase):
    id: str
    teacher_id: str
    subject_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
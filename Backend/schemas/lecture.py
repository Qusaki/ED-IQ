from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LectureCreate(BaseModel):
    title: str
    content: Optional[str] = None

class LectureOut(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    teacher_id: str
    created_at: datetime

    class Config:
        from_attributes = True
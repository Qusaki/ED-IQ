from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ActivityOut(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    teacher_id: str
    subject_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
from datetime import datetime

from pydantic import BaseModel


class GradeBase(BaseModel):
    student_id: str
    score: float


class GradeCreate(GradeBase):
    activity_id: str


class GradeResponse(GradeBase):
    id: str
    activity_id: str
    graded_at: datetime

    class Config:
        from_attributes = True

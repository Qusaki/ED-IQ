from enum import Enum
from typing import Optional

from pydantic import BaseModel


class EnrollmentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EnrollmentBase(BaseModel):
    subject_id: str
    student_id: str


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentUpdate(BaseModel):
    status: Optional[str] = None


class EnrollmentResponse(EnrollmentBase):
    id: str
    status: str

    class Config:
        from_attributes = True


class StudentInSubject(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    status: str
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class SubjectEnrollmentResponse(BaseModel):
    status: str
    subject_id: str

    class Config:
        from_attributes = True


class EnrollmentActionResponse(BaseModel):
    success: bool
    message: str

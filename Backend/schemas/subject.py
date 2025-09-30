from typing import Optional, List
from pydantic import BaseModel
from enum import Enum


class EnrollmentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class SubjectBase(BaseModel):
    name: str


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = None


class SubjectResponse(SubjectBase):
    id: str
    code: str
    owner_id: str
    
    class Config:
        from_attributes = True


class SubjectJoin(BaseModel):
    code: str


class StudentInSubject(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    status: str
    
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


class SubjectWithStudents(SubjectResponse):
    students: List[StudentInSubject] = []

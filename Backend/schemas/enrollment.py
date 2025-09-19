from pydantic import BaseModel

class StudentInSubject(BaseModel):
    id: str
    name: str | None = None
    email: str | None = None
    status: str

    class Config:
        orm_mode = True

class SubjectEnrollmentResponse(BaseModel):
    status: str
    subject_id: str
    
    class Config:
        orm_mode = True

class AcceptedRejectedResponse(BaseModel):
    success: bool
    message: str
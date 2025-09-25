from typing import Optional
from pydantic import BaseModel, EmailStr


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None

class SelfUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str

    class Config:
        orm_mode = True

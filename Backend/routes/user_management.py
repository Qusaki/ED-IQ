from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID, uuid4

from models.user import User
from dependencies import required_role, get_current_user

from sqlalchemy.orm import Session
from database import get_db

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User Management Schemas
class UserUpdate(BaseModel):
    # User update schema
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None

class SelfUpdate(BaseModel):
    # Self-update schema
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    # User response schema
    id: UUID
    email: EmailStr
    role: str

    class Config:
        orm_mode = True

# Admin-only route to get all users
@router.get("/user", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db), 
    role=Depends(required_role("admin"))
):
    # Fetch all users from the database
    return db.query(User).all()

# Admin-only route to update a user
@router.get("/user/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID, 
    db: Session = Depends(get_db), 
    role=Depends(required_role("admin"))
):
    # Fetch a user by ID
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Admin-only route to update a user
@router.put("/user/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID, 
    user_update: UserUpdate, 
    db: Session = Depends(get_db), 
    role=Depends(required_role("admin"))
):
    # Fetch the user to update
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user fields
    if user_update.email:
        user.email = user_update.email
    if user_update.role:
        user.role = user_update.role
    if user_update.password:
        user.password = pwd_context.hash(user_update.password)

    db.commit()
    db.refresh(user)
    return user

# Self-update route for the current user
@router.delete("/user/{user_id}", status_code=204)
def delete_user(
    user_id: UUID, 
    db: Session = Depends(get_db), 
    role=Depends(required_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}


# self-service route for the current user

@router.get("/user/self", response_model=UserResponse)
def read_self(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/user/self", response_model=UserResponse)
def self_update(
    user_update: SelfUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Fetch the current user
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user fields
    if user_update.email:
        user.email = user_update.email
    if user_update.password:
        user.password = pwd_context.hash(user_update.password)

    db.commit()
    db.refresh(user)
    return user


from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from typing import List
from schemas.user_management import UserResponse, UserUpdate, SelfUpdate
from models.user import User
from dependencies import required_role, get_current_user

from sqlalchemy.orm import Session
from database import get_db

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Admin-only route to get all users
@router.get("/user", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db), 
    role=Depends(required_role("admin"))
):
    return db.query(User).all()

# get user by id
@router.get("/user/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str, 
    db: Session = Depends(get_db), 
    role=Depends(required_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Admin-only route to update a user
@router.put("/user/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str, 
    user_update: UserUpdate, 
    db: Session = Depends(get_db), 
    role=Depends(required_role("admin"))
):
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
@router.delete("/user/{user_id}")
def delete_user(
    user_id: str, 
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
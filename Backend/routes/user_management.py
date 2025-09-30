from fastapi import APIRouter, Depends, HTTPException
import bcrypt
from typing import List
from schemas.user import UserResponse, UserUpdate, UserSelfUpdate
from models.user import User
from dependencies import required_role, get_current_user

from sqlalchemy.orm import Session
from database import get_db

router = APIRouter()


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
        user.password = bcrypt.hashpw(user_update.password.encode(), bcrypt.gensalt())
    if user_update.name:
        user.name = user_update.name

    db.commit()
    db.refresh(user)
    return user

# Admin-only route to delete a user
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
    user_update: UserSelfUpdate, 
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
        user.password = bcrypt.hashpw(user_update.password.encode(), bcrypt.gensalt())
    if user_update.name:
        user.name = user_update.name

    db.commit()
    db.refresh(user)
    return user
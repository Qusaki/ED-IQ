from typing import List

import bcrypt
from database import get_db
from dependencies import get_current_user, required_role
from fastapi import APIRouter, Depends, HTTPException
from models.user import User
from schemas.user import UserResponse, UserSelfUpdate, UserUpdate
from sqlalchemy.orm import Session

router = APIRouter()


# Admin-only route to get all users
@router.get("/user", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), role=Depends(required_role("admin"))):
    return db.query(User).all()


# self-service routes for the current user (must come before {user_id} routes)
@router.get("/user/self", response_model=UserResponse)
def read_self(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/user/self", response_model=UserResponse)
def self_update(
    user_update: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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


# get user by id
@router.get("/user/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str, db: Session = Depends(get_db), role=Depends(required_role("admin"))
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
    role=Depends(required_role("admin")),
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
    user_id: str, db: Session = Depends(get_db), role=Depends(required_role("admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}

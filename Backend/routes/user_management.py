from typing import List, Optional

import bcrypt
from database import get_db
from dependencies import get_current_user, required_role
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form # Added Form
from models.user import User
from schemas.user import UserResponse, UserSelfUpdate, UserUpdate
from sqlalchemy.orm import Session
from utils.supabase import upload_file_to_supabase, delete_file_from_supabase, extract_filename_from_url
import os # Import os module for path manipulation
from pydantic import EmailStr # Added EmailStr

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
async def self_update(
    name: Optional[str] = Form(None),
    email: Optional[EmailStr] = Form(None), # Using EmailStr for validation
    password: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch the current user
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user fields
    if email:
        user.email = email
    if password:
        user.password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    if name:
        user.name = name
    
    # Handle profile picture upload
    if profile_picture:
        # Delete old profile picture from Supabase if it exists
        if user.profile_picture:
            old_filename = extract_filename_from_url(user.profile_picture)
            if old_filename:
                if old_filename.startswith("profile_pictures_"): # only delete if it's an uploaded file
                     delete_file_from_supabase(old_filename)

        # Generate a unique name for the new profile picture
        file_extension = os.path.splitext(profile_picture.filename)[1]
        destination_name = f"profile_pictures/{current_user.id}_{os.urandom(8).hex()}{file_extension}"
        
        # Upload new profile picture to Supabase
        new_profile_picture_url = upload_file_to_supabase(profile_picture, destination_name)
        user.profile_picture = new_profile_picture_url
    

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





    # Check if the user has a custom profile picture and delete it from Supabase


    if user.profile_picture:


        # Get the default profile picture URL from the User model (assuming User model is imported)


        DEFAULT_PROFILE_PICTURE_URL = "https://rjtiibjejbnubuteheph.supabase.co/storage/v1/object/public/EDIQ-bucket/default_profile_pictures/default_profile.jpg"





        if user.profile_picture != DEFAULT_PROFILE_PICTURE_URL:


            old_filename = extract_filename_from_url(user.profile_picture)


            if old_filename:


                # Ensure we only try to delete user-uploaded pictures, not system defaults


                # The 'profile_pictures/' prefix is for user-uploaded images,


                # 'default_profile_pictures/' is for the global default.


                if old_filename.startswith("profile_pictures/"):


                    delete_file_from_supabase(old_filename)





    db.delete(user)


    db.commit()


    return {"detail": "User deleted successfully"}




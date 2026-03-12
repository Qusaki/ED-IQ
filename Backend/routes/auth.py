import os
import uuid

import bcrypt
import jwt
from database import get_db
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from models.user import User
from schemas.user import LoginResponse, UserCreate, UserLogin, UserResponse
from sqlalchemy.orm import Session

router = APIRouter()

# Load environment variables from .env file
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

if not SECRET_KEY or not ALGORITHM:
    raise ValueError("JWT_SECRET and JWT_ALGORITHM environment variables must be set")


@router.post(
    "/signup/", status_code=status.HTTP_201_CREATED, response_model=UserResponse
)
def signup_user(user: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
        )

    # Hash the password
    hashed_pw = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())

    # Create a new user instance
    user_db = User(
        id=str(uuid.uuid4()),
        email=user.email,
        name=user.name,
        role=user.role,
        student_id=user.student_id,
        password=hashed_pw,
        profile_picture="https://rjtiibjejbnubuteheph.supabase.co/storage/v1/object/public/EDIQ-bucket/default_profile_pictures/default_profile.jpg",
    )

    # Add user to the database
    db.add(user_db)
    db.commit()
    db.refresh(user_db)

    

    return UserResponse.model_validate(user_db)


@router.post("/login/", response_model=LoginResponse)
def login_user(user: UserLogin, db: Session = Depends(get_db)) -> LoginResponse:
    # Check if user exists
    user_db = db.query(User).filter(User.email == user.email).first()

    if not user_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or password"
        )

    # Verify password
    is_match = bcrypt.checkpw(user.password.encode(), user_db.password)

    if not is_match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or password"
        )

    # Generate JWT token
    token = jwt.encode(
        {"user_id": user_db.id, "role": user_db.role}, SECRET_KEY, algorithm=ALGORITHM
    )

    return LoginResponse(token=token, user=UserResponse.model_validate(user_db))


@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    from models.password_reset import PasswordReset
    from utils.email import send_password_reset_email
    from datetime import datetime, timedelta
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Silently fail to avoid user enumeration, but log for debugging
        print(f"[DEBUG] Forgot password requested for non-existent email: {email}")
        return {"message": "If an account exists for this email, a reset link has been sent."}
    
    # Invalidate any existing tokens for this user
    db.query(PasswordReset).filter(PasswordReset.user_id == user.id).update({"used": True})
    
    # Generate new token
    token = str(uuid.uuid4())
    reset_request = PasswordReset(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(reset_request)
    db.commit()
    
    # Send email
    send_password_reset_email(user.email, token)
    
    return {"message": "If an account exists for this email, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    from models.password_reset import PasswordReset
    from datetime import datetime
    import bcrypt
    
    reset_request = db.query(PasswordReset).filter(
        PasswordReset.token == token,
        PasswordReset.used == False,
        PasswordReset.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_request:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user = db.query(User).filter(User.id == reset_request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    hashed_pw = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
    user.password = hashed_pw
    
    # Mark token as used
    reset_request.used = True
    
    db.commit()
    
    return {"message": "Password updated successfully"}


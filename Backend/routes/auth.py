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
        password=hashed_pw,
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

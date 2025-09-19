import uuid
import os
from fastapi import Depends, HTTPException
from database import get_db
from models.user import User
from schemas.user_create import UserCreate
from fastapi import APIRouter
from sqlalchemy.orm import Session
import bcrypt
from schemas.user_login import UserLogin
import jwt

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")  # match dependencies.py
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")     # default to HS256

@router.post('/signup/', status_code=201)
def signup_user(user: UserCreate, db: Session=Depends(get_db)):
    # check if user already exists
    user_db = db.query(User).filter(User.email == user.email).first()

    if user_db:
        # if user exists, raise an error
        raise HTTPException(400, "Email already exists")
    
    # hash the password
    hashed_pw = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())
    # create a new user instance
    user_db = User(id=str(uuid.uuid4()), email=user.email, name=user.name, role=user.role, password=hashed_pw)
    
    
    # add user to the database
    db.add(user_db)
    db.commit()
    db.refresh(user_db)

    return user_db


@router.post('/login/')
def login_user(user: UserLogin, db: Session=Depends(get_db)):
    # check if user exists
    user_db = db.query(User).filter(User.email == user.email).first()

    if not user_db:
        raise HTTPException(400, "Invalid email or password")

    # password matching or not
    is_match = bcrypt.checkpw(user.password.encode(), user_db.password)

    if not is_match:
        raise HTTPException(400, "Invalid email or password")
    
    token = jwt.encode(
        {'user_id': user_db.id, 'role': user_db.role},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
   
    return {'token': token, 'user': user_db}  # Return user data without password for security reasons
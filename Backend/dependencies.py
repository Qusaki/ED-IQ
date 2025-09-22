import os
import jwt

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from models.user import User
from jwt import PyJWTError

from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import get_db


load_dotenv() # Load environment variables from .env file


SECRET_KEY = os.getenv("JWT_SECRET")  # Use env var in production!
ALGORITHM = os.getenv("JWT_ALGORITHM")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login") # Token endpoint


# Get current user from token
def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
# role-based dependency checker
def required_role(*roles: str):
    def role_checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Operation not permitted for this role")
        return user
    return role_checker
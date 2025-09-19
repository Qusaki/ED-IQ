from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
import os

from database import get_db
from models.user import User

SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")  # Use env var in production!
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login") # Token endpoint


# Get current user from token
def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
# role-based dependency cheker
def required_role(*roles: str):
    def role_checker(role: str = Depends(get_current_user)):
        if role not in roles:
            raise HTTPException(status_code=403, detail="Operation not permitted for this role")
        return role
    return role_checker
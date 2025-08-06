from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login") # OAuth2 scheme for token authentication


# Function to get the current user role from the JWT token
def get_current_user_role(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, 'password_key', algorithms=['HS256'])
        return payload.get("role")
    except jwt.PyJWTError: 
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# role-based dependency cheker
def required_role(required_role: str):
    def role_checker(role: str = Depends(get_current_user_role)):
        if role != required_role:
            raise HTTPException(status_code=403, detail="Operation not permitted for this role")
    return role_checker
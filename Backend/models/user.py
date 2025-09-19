from sqlalchemy import TEXT, Column, VARCHAR, LargeBinary
from models.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(TEXT, primary_key=True)
    name = Column(VARCHAR(50), nullable=False)
    email = Column(VARCHAR(50), unique=True, nullable=False, index=True)
    role = Column(VARCHAR(20), nullable=False)  # e.g., "student" or "teacher"
    password = Column(LargeBinary, nullable=False)  # Store hashed password as binary data
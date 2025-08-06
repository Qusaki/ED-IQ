from sqlalchemy import TEXT, Column, VARCHAR, LargeBinary
from models.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(TEXT, primary_key=True)
    name = Column(VARCHAR(50))
    email = Column(VARCHAR(50))
    role = Column(VARCHAR(20))
    password = Column(LargeBinary)  # Store hashed password as binary data
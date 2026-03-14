from models.base import Base
from sqlalchemy import TEXT, VARCHAR, Column, LargeBinary, Integer, Date


class User(Base):
    __tablename__ = "users"

    id = Column(TEXT, primary_key=True)
    name = Column(VARCHAR(50), nullable=False)
    email = Column(VARCHAR(50), unique=True, nullable=False, index=True)
    role = Column(VARCHAR(20), nullable=False)  # e.g., "student" or "teacher"
    student_id = Column(VARCHAR(20), nullable=True)  # Only for students
    password = Column(
        LargeBinary, nullable=False
    )  # Store hashed password as binary data
    profile_picture = Column(
        TEXT,
        nullable=False,
        default="https://rjtiibjejbnubuteheph.supabase.co/storage/v1/object/public/EDIQ-bucket/default_profile_pictures/default_profile.jpg",
    )
    chatbot_requests_today = Column(Integer, default=0, nullable=False)
    last_chatbot_request_date = Column(Date, nullable=True)

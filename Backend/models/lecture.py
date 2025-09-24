from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from models.base import Base
import uuid

class Lecture(Base):
    __tablename__ = 'lectures'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(String, nullable=True) # store the GCS file URL
    teacher_id = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
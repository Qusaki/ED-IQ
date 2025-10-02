from sqlalchemy import Column, ForeignKey, Text, DateTime, func, Integer
from models.base import Base

class Submission(Base):
    __tablename__ = 'submissions'

    id = Column(Text, primary_key=True)
    content = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    student_id = Column(Text, ForeignKey('users.id'), nullable=False)
    activity_id = Column(Text, ForeignKey('activities.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    score = Column(Integer, nullable=True)
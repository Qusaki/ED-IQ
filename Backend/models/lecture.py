from sqlalchemy import Column, VARCHAR, Text, DateTime, ForeignKey, func
from models.base import Base

class Lecture(Base):
    __tablename__ = 'lectures'

    id = Column(Text, primary_key=True)
    title = Column(VARCHAR(200), nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True) # store the GCS file URL
    teacher_id = Column(Text, ForeignKey('users.id'), nullable=False)
    subject_id = Column(Text, ForeignKey('subject.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
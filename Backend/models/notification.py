from sqlalchemy import Column, VARCHAR, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from models.base import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(VARCHAR(100), nullable=False)
    message = Column(VARCHAR(255), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    subject_id = Column(Text, ForeignKey("subject.id", ondelete="CASCADE"), nullable=True)
    activity_id = Column(Text, ForeignKey("activity.id", ondelete="CASCADE"), nullable=True)
    lecture_id = Column(Text, ForeignKey("lectures.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
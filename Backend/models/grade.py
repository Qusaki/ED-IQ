from models.base import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Text, func


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Text, primary_key=True)
    student_id = Column(
        Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = Column(
        Text, ForeignKey("subject.id", ondelete="CASCADE"), nullable=False
    )
    score = Column(Float, nullable=False, default=0.0)
    graded_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

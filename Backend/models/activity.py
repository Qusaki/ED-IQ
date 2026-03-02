from models.base import Base
from sqlalchemy import VARCHAR, Column, DateTime, ForeignKey, Integer, Text, func


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Text, primary_key=True)
    title = Column(VARCHAR(200), nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    teacher_id = Column(
        Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = Column(
        Text, ForeignKey("subject.id", ondelete="CASCADE"), nullable=False
    )
    category = Column(
        VARCHAR(50), nullable=False, default="quiz"
    )  # laboratory, quiz, assignment, attendance, major exam, lab exam, project
    term = Column(VARCHAR(50), nullable=False, default="midterm")  # midterm, final
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    max_score = Column(Integer, nullable=False, default=100)

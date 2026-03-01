import enum

from models.base import Base
from sqlalchemy import TEXT, VARCHAR, Column, ForeignKey, UniqueConstraint


class Subject(Base):
    __tablename__ = "subject"

    id = Column(TEXT, primary_key=True)
    name = Column(VARCHAR(100), nullable=False)
    code = Column(VARCHAR(16), unique=True, nullable=False)
    owner_id = Column(TEXT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)


class EnrollmentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class SubjectEnrollment(Base):
    __tablename__ = "subject_enrollment"
    __table_args__ = (
        UniqueConstraint("subject_id", "student_id", name="uq_subject_student"),
    )

    id = Column(TEXT, primary_key=True)
    subject_id = Column(
        TEXT, ForeignKey("subject.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(
        TEXT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status = Column(VARCHAR(20), nullable=False, default=EnrollmentStatus.PENDING.value)
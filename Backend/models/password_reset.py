from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Boolean
from models.base import Base

class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow() + timedelta(hours=1))
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

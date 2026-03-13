from datetime import date
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from models.base import Base

class ChatUsage(Base):
    __tablename__ = "chat_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    usage_date = Column(Date, default=date.today, nullable=False)
    count = Column(Integer, default=0, nullable=False)

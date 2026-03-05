import os
import sys

# Add Backend to path
sys.path.append(os.path.abspath("."))
os.environ["JWT_SECRET"] = "test"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["WEBHOOK_SECRET"] = "test"
os.environ["SUPABASE_URL"] = "http://test"
os.environ["SUPABASE_KEY"] = "test"

from routes.activity_post import get_activity_by_subject

import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker
from models.user import User

engine = sa.create_engine(os.environ['DATABASE_URL'])
Session = sessionmaker(bind=engine)
session = Session()

import asyncio

async def test():
    # Pick a random subject and user pair from subject_enrollments
    res = session.execute(sa.text("SELECT subject_id, student_id FROM subject_enrollments WHERE status='approved' LIMIT 1")).fetchone()
    if res:
        subject_id = res[0]
        user_id = res[1]
    else:
        print("No approved enrollments found.")
        return

    print(f"Testing subject {subject_id} with user {user_id}")
    
    mock_user = User(id=user_id, name="Test")

    try:
        activities = await get_activity_by_subject(subject_id=subject_id, db=session, current_user=mock_user)
        print(f"Success! Returned {len(activities)} activities.")
    except Exception as e:
        print("ENDPOINT CRASHED!!!")
        import traceback
        traceback.print_exc()

asyncio.run(test())

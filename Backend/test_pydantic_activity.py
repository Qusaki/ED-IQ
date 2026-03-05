import os
import sys
from datetime import datetime

# Add Backend to path
sys.path.append(os.path.abspath("."))

from schemas.activity import ActivityResponse
from models.activity import Activity

# Create dummy activity
act = Activity(
    id="act123",
    title="Test Quiz",
    content="This is a test",
    file_url=None,
    category="quiz",
    term="midterm",
    due_date=None,  # Intentionally string/None to see if it breaks datetime casting from ORM
    max_score=100,
    teacher_id="teacher123",
    subject_id="sub123",
    created_at=datetime.now(),
    updated_at=datetime.now()
)

print("Testing ActivityResponse with ORM object...")
try:
    res = ActivityResponse.from_orm(act)
    print("Success. Result:", res.model_dump())
except Exception as e:
    print("Failed with from_orm:", e)

try:
    res = ActivityResponse.model_validate(act)
    print("Success. Result:", res.model_dump())
except Exception as e:
    print("Failed with model_validate:", type(e), str(e))

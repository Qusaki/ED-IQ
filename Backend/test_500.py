import os
import sys

# Add Backend to path
sys.path.append(os.path.abspath("."))

from fastapi.testclient import TestClient
from main import app
from database import get_db

# Mock user for dependencies
from dependencies import get_current_user
from models.user import User

# Use a subject ID from the database
import sqlalchemy as sa
engine = sa.create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT id, owner_id FROM subject LIMIT 1"))
    row = res.fetchone()
    if row:
        subject_id = row[0]
        owner_id = row[1]
    else:
        subject_id = "test"
        owner_id = "test"

def mock_get_current_user():
    return User(id=owner_id, name="Test Teacher", email="test@teacher.com", role="teacher")

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

print(f"Testing GET /activities/{subject_id}...")
try:
    response = client.get(f"/activities/{subject_id}")
    print("Status:", response.status_code)
    print("Body:", response.json()[:100] if response.status_code == 200 else response.text)
except Exception as e:
    print("Exception on activities:", e)

print(f"\nTesting GET /lectures/{subject_id}...")
try:
    response = client.get(f"/lectures/{subject_id}")
    print("Status:", response.status_code)
    print("Body:", response.json()[:100] if response.status_code == 200 else response.text)
except Exception as e:
    print("Exception on lectures:", e)

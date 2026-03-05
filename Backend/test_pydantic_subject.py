import os
import sys

# Add Backend to path
sys.path.append(os.path.abspath("."))

from pydantic import ValidationError
from schemas.subject import SubjectResponse
from models.subject import Subject

# Create dummy subject
s = Subject(id="123", name="Math", code="MATH101", owner_id="456")

print("Testing SubjectResponse with ORM object...")
try:
    res = SubjectResponse.from_orm(s)
    print("Success. Result:", res.model_dump())
except Exception as e:
    print("Failed with from_orm:", e)

try:
    res = SubjectResponse.model_validate(s)
    print("Success. Result:", res.model_dump())
except Exception as e:
    print("Failed with model_validate:", e)

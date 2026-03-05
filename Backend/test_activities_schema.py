import os
import sys

# Add Backend to path
sys.path.append(os.path.abspath("."))

from schemas.activity import ActivityResponse
from models.activity import Activity
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker

engine = sa.create_engine(os.environ['DATABASE_URL'])
Session = sessionmaker(bind=engine)
session = Session()

activities = session.query(Activity).all()
print(f"Total activities in DB: {len(activities)}")

errors = 0
for act in activities:
    try:
        # Pydantic v2 from_orm equivalent
        ActivityResponse.model_validate(act)
    except Exception as e:
        print(f"\nError serializing activity {act.id}:")
        print(e)
        errors += 1

print(f"\nTotal errors found: {errors}")

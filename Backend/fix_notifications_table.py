import os
from sqlalchemy import create_engine, text

DATABASE_URL = "sqlite:///database.db"
engine = create_engine(DATABASE_URL)
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE notifications ADD COLUMN activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE"))
        print("Added activity_id")
    except Exception as e:
        print("Activity ID error:", e)

    try:
        conn.execute(text("ALTER TABLE notifications ADD COLUMN lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE"))
        print("Added lecture_id")
    except Exception as e:
        print("Lecture ID error:", e)

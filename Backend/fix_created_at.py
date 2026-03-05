import os
import sqlalchemy as sa

engine = sa.create_engine(os.environ['DATABASE_URL'])

with engine.begin() as conn:
    print("Executing ALTER TABLE to add created_at...")
    conn.execute(sa.text("ALTER TABLE subject_enrollment ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;"))
    print("Column added flawlessly.")

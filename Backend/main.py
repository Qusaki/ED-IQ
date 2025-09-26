from fastapi import FastAPI
from models.base import Base
from routes import auth, protected, user_management, subject, lecture_post, activity_post

from database import engine
from sqlalchemy import inspect, text

app = FastAPI()

def ensure_column_exists(table_name: str, column_name: str, ddl_sql: str):
    insp = inspect(engine)
    cols = [c['name'] for c in insp.get_columns(table_name)]
    if column_name in cols:
        return  # Already exists, do nothing
    with engine.begin() as conn:
        conn.execute(text(ddl_sql))

def backfill_null_status(table_name: str, column_name: str, default_value: str):
    with engine.begin() as conn:
        conn.execute(
            text(f"UPDATE {table_name} SET {column_name} = :v WHERE {column_name} IS NULL"),
            {"v": default_value}
        )

def run_startup_migrations():
    Base.metadata.create_all(engine)
    add_status_col_sql = "ALTER TABLE subject_enrollment ADD COLUMN status VARCHAR(20) DEFAULT 'pending'"
    ensure_column_exists("subject_enrollment", "status", add_status_col_sql)
    backfill_null_status("subject_enrollment", "status", "pending")

run_startup_migrations()

app.include_router(auth.router, prefix='/auth', tags=['Authentication'])
app.include_router(protected.router, prefix='/protected', tags=['Protected'])
app.include_router(user_management.router, prefix='/user_management', tags=['User Management'])
app.include_router(subject.router, prefix='/subjects' , tags=['Classrom subject'])
app.include_router(lecture_post.router, prefix='/lectures', tags=['lectures'])
app.include_router(activity_post.router, prefix='/activities', tags=['activities'])
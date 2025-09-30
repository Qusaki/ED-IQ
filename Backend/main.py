from fastapi import FastAPI
from sqlalchemy import inspect, text

from database import engine
from models.base import Base
from routes import activity_post, auth, lecture_post, subject, user_management

app = FastAPI(
    title="ED-IQ Backend API",
    description="Educational Intelligence Platform Backend",
    version="1.0.0"
)

def ensure_column_exists(table_name: str, column_name: str, ddl_sql: str) -> None:
    insp = inspect(engine)
    cols = [c['name'] for c in insp.get_columns(table_name)]
    if column_name in cols:
        return
    with engine.begin() as conn:
        conn.execute(text(ddl_sql))

def backfill_null_status(table_name: str, column_name: str, default_value: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(f"UPDATE {table_name} SET {column_name} = :v WHERE {column_name} IS NULL"),
            {"v": default_value}
        )

def run_startup_migrations() -> None:
    Base.metadata.create_all(engine)
    add_status_col_sql = "ALTER TABLE subject_enrollment ADD COLUMN status VARCHAR(20) DEFAULT 'pending'"
    ensure_column_exists("subject_enrollment", "status", add_status_col_sql)
    backfill_null_status("subject_enrollment", "status", "pending")

run_startup_migrations()

# Include routers
app.include_router(auth.router, prefix='/auth', tags=['Authentication'])
app.include_router(user_management.router, prefix='/user_management', tags=['User Management'])
app.include_router(subject.router, prefix='/subjects', tags=['Classroom Subject'])
app.include_router(lecture_post.router, prefix='/lectures', tags=['Lectures'])
app.include_router(activity_post.router, prefix='/activities', tags=['Activities'])
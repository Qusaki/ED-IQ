from fastapi import FastAPI
from routes import (
    activity_post,
    auth,
    grade,
    lecture_post,
    notification,
    offline_act,
    realtime,
    subject,
    submission_post,
    user_management, chatbot
)
from utils.scheduler import start_scheduler, shutdown_scheduler
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback
import sys

app = FastAPI(
    title="ED-IQ Backend API",
    description="Educational Intelligence Platform Backend",
    version="1.0.0",
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    with open("500_errors.log", "a") as f:
        f.write(f"\n--- Exception at {request.url} ---\n")
        traceback.print_exc(file=f)
    print(f"Captured 500 error. Saved to 500_errors.log.", file=sys.stderr)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    response = await call_next(request)
    # Add cache control only for GET requests and non-websocket/health paths
    if request.method == "GET" and not request.url.path.startswith("/ws") and request.url.path != "/health":
        response.headers["Cache-Control"] = "public, max-age=60"
    return response

from fastapi.responses import JSONResponse, PlainTextResponse
import os

@app.get("/log_errors", include_in_schema=False)
async def get_log_errors():
    if os.path.exists("500_errors.log"):
        with open("500_errors.log", "r") as f:
            return PlainTextResponse(f.read())
    return PlainTextResponse("No errors logged yet.")

@app.get("/diag-env", include_in_schema=False)
async def diag_env():
    return {
        "RESEND_API_KEY_SET": bool(os.getenv("RESEND_API_KEY")),
        "FROM_EMAIL_SET": bool(os.getenv("FROM_EMAIL")),
        "FROM_EMAIL_VALUE": os.getenv("FROM_EMAIL", "onboarding@resend.dev"),
        "DATABASE_URL_SET": bool(os.getenv("DATABASE_URL")),
    }

from alembic.config import Config
from alembic import command
import sys
import io

# Capture stderr to a string buffer
stderr_buffer = io.StringIO()
sys.stderr = stderr_buffer

@app.get("/startup_logs", include_in_schema=False)
async def get_startup_logs():
    return PlainTextResponse(stderr_buffer.getvalue() or "No logs in stderr buffer.")

@app.on_event("startup")
async def startup_event():
    try:
        print("Running database migrations...", file=sys.stderr)
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        print("Database migrations applied successfully.", file=sys.stderr)
    except Exception as e:
        print(f"Error applying migrations: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    shutdown_scheduler()

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

@app.get("/health", summary="Perform a Health Check", response_description="Return HTTP Status Code 200 (OK)")
async def health_check():
    return {"status": "OK", "message": "Service is healthy"}

app.include_router(
    user_management.router, prefix="/user_management", tags=["User Management"]
)
app.include_router(subject.router, prefix="/subjects", tags=["Classroom Subject"])
app.include_router(lecture_post.router, prefix="/lectures", tags=["Lectures"])
app.include_router(activity_post.router, prefix="/activities", tags=["Activities"])
app.include_router(submission_post.router, prefix="/submissions", tags=["Submissions"])
app.include_router(grade.router, prefix="/computegrade", tags=["Grades"])
app.include_router(notification.router, prefix="/notification", tags=["Notification"])
app.include_router(realtime.router, prefix="/ws", tags=["Websocket"])
app.include_router(offline_act.router, prefix="/offline", tags=["Offline Score"])
app.include_router(chatbot.router, prefix="/chat", tags=["Chatbot"])

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

app = FastAPI(
    title="ED-IQ Backend API",
    description="Educational Intelligence Platform Backend",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
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

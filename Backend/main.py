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
    user_management,
)

app = FastAPI(
    title="ED-IQ Backend API",
    description="Educational Intelligence Platform Backend",
    version="1.0.0",
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
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
app.inclide_router(offline_act.router, prefix="/offline", tags=["Offline Score"])

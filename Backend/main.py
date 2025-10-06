from fastapi import FastAPI

from routes import activity_post, auth, lecture_post, subject, user_management, submission_post

app = FastAPI(
    title="ED-IQ Backend API",
    description="Educational Intelligence Platform Backend",
    version="1.0.0"
)

# Include routers
app.include_router(auth.router, prefix='/auth', tags=['Authentication'])
app.include_router(user_management.router, prefix='/user_management', tags=['User Management'])
app.include_router(subject.router, prefix='/subjects', tags=['Classroom Subject'])
app.include_router(lecture_post.router, prefix='/lectures', tags=['Lectures'])
app.include_router(activity_post.router, prefix='/activities', tags=['Activities'])
app.include_router(submission_post.router, prefix="/submissions", tags=['Submissions'])
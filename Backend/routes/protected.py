from fastapi import APIRouter, Depends
from dependencies import required_role

router = APIRouter()

@router.get('/admin_only')
def admin_only_route(role=Depends(required_role("admin"))):
    return {"message": "This is an admin-only route."}

@router.get('/teacher_only')
def teacher_only_route(role=Depends(required_role("teacher"))):
    return {"message": "This is a teacher-only route."}

@router.get('/student_only')
def student_only_route(role=Depends(required_role("student"))):
    return {"message": "This is a student-only route."}
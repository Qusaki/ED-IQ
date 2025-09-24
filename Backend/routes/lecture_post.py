from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.lecture import Lecture
from schemas.lecture import LectureOut
from utils.gcs import upload_file_to_gcs
from dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=LectureOut)
async def create_lecture(
    title: str = Form(...),
    content: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user) # teacher must be logged in
):
    # Ensure the user is a teacher
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can create lectures")

    file_url = None
    if file:
        destination_name = f"lectures/{current_user.id}/{file.filename}"
        file_url = upload_file_to_gcs(file, destination_name)

    lecture = Lecture(
        title=title,
        content=content,
        file_url=file_url,
        teacher_id=current_user.id
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    return lecture
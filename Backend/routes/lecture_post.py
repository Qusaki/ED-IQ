from typing import List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.lecture import Lecture
from schemas.lecture import LectureOut
# from utils.gcs import upload_file_to_gcs
from dependencies import get_current_user

router = APIRouter()

# Route to create a new lecture (teacher only)
@router.post("/{subject_id}", response_model=LectureOut)
async def create_lecture(
    subject_id: str,
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
   # if file:
   #     destination_name = f"lectures/{current_user.id}/{file.filename}"
   #     file_url = upload_file_to_gcs(file, destination_name)

    lecture = Lecture(
        id=str(uuid4()),
        title=title,
        content=content,
        file_url=file_url,
        teacher_id=current_user.id,
        subject_id=subject_id
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    return lecture

# view all lectures in subject
@router.get("/{subject_id}", response_model=List[LectureOut])
async def get_lectures_by_subject(
    subject_id: str,
    db: Session = Depends(get_db)
):
    lectures = db.query(Lecture).filter(Lecture.subject_id == subject_id).order_by(Lecture.created_at.desc()).all()

    if not lectures:
        raise HTTPException(status_code=404, detail="no lectures found in this subject")
    return lectures

# edit post in lecture
@router.put("/{lecture_id}", response_model=LectureOut)
async def update_lecture(
    lecture_id: str,
    title: str = Form(None),
    content: str = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

    if not lecture:
        raise HTTPException(status_code=404, detail="lecture not found")

    if lecture.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own lecture")
    
    if title:
        lecture.title = title
    if content:
        lecture.content = content

    db.commit()
    db.refresh(lecture)

    return lecture

# delete post in lecture
@router.delete("/{Lecture_id}")
def delete_lecture(
    lecture_id: str,
    db: Session = Depends(get_db)
):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

    if not lecture:
        raise HTTPException(status_code=404, detail="lecture not found")

    db.delete(lecture)
    db.commit()

    return {"message": "Lecture deleted successfully"}
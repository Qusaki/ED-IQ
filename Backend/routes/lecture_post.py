from typing import List, Optional
from uuid import uuid4

from database import get_db
from dependencies import get_current_user
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from models.lecture import Lecture
from models.subject import Subject, SubjectEnrollment
from schemas.lecture import LectureResponse
from sqlalchemy.orm import Session

# from utils.gcs import upload_file_to_gcs, delete_file_from_gcs, extract_filename_from_url
from utils.supabase import (
    delete_file_from_supabase,
    extract_filename_from_url,
    upload_file_to_supabase,
)

router = APIRouter()


# Route to create a new lecture (teacher only)
@router.post("/{subject_id}", response_model=LectureResponse)
async def create_lecture(
    subject_id: str,
    title: str = Form(...),
    content: str = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),  # teacher must be logged in
):
    # Ensure the user is the owner of the subject
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the subject owner can create Lectures"
        )

    file_url = None
    if file and getattr(file, "filename", ""):
        destination_name = f"lectures/{subject_id}/{file.filename}"
        file_url = upload_file_to_supabase(file, destination_name)

    lecture = Lecture(
        id=str(uuid4()),
        title=title,
        content=content,
        file_url=file_url,
        teacher_id=current_user.id,
        subject_id=subject_id,
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    return lecture


# view all lectures in subject
@router.get("/{subject_id}", response_model=List[LectureResponse])
async def get_lectures_by_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Ensure the user is either the subject owner or an approved student
    enrolled = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.student_id == current_user.id,
            SubjectEnrollment.status == "approved",
        )
        .first()
    )

    if (subject.owner_id != current_user.id) and (not enrolled):
        raise HTTPException(
            status_code=403, detail="You do not have access to this subject's Lectures"
        )

    lectures = (
        db.query(Lecture)
        .filter(Lecture.subject_id == subject_id)
        .order_by(Lecture.created_at.desc())
        .all()
    )

    if not lectures:
        raise HTTPException(status_code=404, detail="no lectures found in this subject")
    return lectures


# for open specific post
@router.get("/{subject_id}/{lecture_id}", response_model=LectureResponse)
async def open_lecture(
    subject_id: str,
    lecture_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Ensure the user is either the subject owner or an approved student
    enrolled = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.student_id == current_user.id,
            SubjectEnrollment.status == "approved",
        )
        .first()
    )

    if (subject.owner_id != current_user.id) and (not enrolled):
        raise HTTPException(
            status_code=403, detail="You do not have access to this subject's Lectures"
        )

    return lecture


# edit post in lecture
@router.put("/{lecture_id}", response_model=LectureResponse)
async def update_lecture(
    lecture_id: str,
    title: str = Form(None),
    content: str = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

    if not lecture:
        raise HTTPException(status_code=404, detail="lecture not found")

    if lecture.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only update your own lecture"
        )

    if title:
        lecture.title = title
    if content:
        lecture.content = content

    if file and getattr(file, "filename", ""):
        # delete old file
        if lecture.file_url:
            filename = extract_filename_from_url(lecture.file_url)
            delete_file_from_supabase(filename)

        # upload new file
        destination_name = f"lectures/{lecture.subject_id}/{file.filename}"
        file_url = upload_file_to_supabase(file, destination_name)

        # update the url file in db
        lecture.file_url = file_url

    db.commit()
    db.refresh(lecture)

    return lecture


# delete post in lecture
@router.delete("/{lecture_id}")
def delete_lecture(
    lecture_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

    if not lecture:
        raise HTTPException(status_code=404, detail="lecture not found")

    if lecture.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own lecture"
        )

    # delete file from gcs
    if lecture.file_url:
        filename = extract_filename_from_url(lecture.file_url)
        delete_file_from_supabase(filename)

    db.delete(lecture)
    db.commit()

    return {"message": "Lecture deleted successfully"}

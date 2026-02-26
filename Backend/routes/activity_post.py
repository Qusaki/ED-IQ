from typing import List, Optional
from uuid import uuid4

from database import get_db
from dependencies import get_current_user
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from models.activity import Activity
from models.subject import Subject, SubjectEnrollment
from schemas.activity import ActivityResponse
from sqlalchemy.orm import Session

from utils.notify import notify_students

# from utils.gcs import upload_file_to_gcs, extract_filename_from_url, delete_file_from_gcs
from utils.supabase import (
    delete_file_from_supabase,
    extract_filename_from_url,
    upload_file_to_supabase,
)

router = APIRouter()


# route to create activity post
@router.post("/{subject_id}", response_model=ActivityResponse)
async def create_activity(
    subject_id: str,
    title: str = Form(...),
    content: str = Form(None),
    category: str = Form('quiz'),
    term: str = Form('midterm'),
    file: Optional[UploadFile] = File(None),
    max_score: int = Form(100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),  # teacher must be logged in
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the subject owner can create Activity"
        )

    file_url = None
    if file and getattr(file, "filename", ""):
        destination_name = f"activities_{subject_id}_{file.filename}"
        file_url = upload_file_to_supabase(file, destination_name)

    activity = Activity(
        id=str(uuid4()),
        title=title,
        content=content,
        file_url=file_url,
        category=category,
        term=term,
        max_score=max_score,
        teacher_id=current_user.id,
        subject_id=subject_id,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    # real-time push + save in DB
    await notify_students(subject_id, "New Activity", f"{title} has been posted.", db)

    return activity


# view all activity in subject
@router.get("/{subject_id}", response_model=List[ActivityResponse])
async def get_activity_by_subject(
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
            status_code=403,
            detail="You do not have access to this subject's Activities",
        )

    activities = (
        db.query(Activity)
        .filter(Activity.subject_id == subject_id)
        .order_by(Activity.created_at.desc())
        .all()
    )

    if not activities:
        raise HTTPException(
            status_code=404, detail="no activities found in this subject"
        )
    return activities


# for open specific activity
@router.get("/{subject_id}/{activity_id}", response_model=ActivityResponse)
async def open_activity(
    subject_id: str,
    activity_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

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
            status_code=403, detail="You do not have access to this subject's Activity"
        )

    return activity


# edit post in activity
@router.put("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: str,
    title: str = Form(None),
    content: str = Form(None),
    category: str = Form(None),
    term: str = Form(None),
    max_score: str = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="activity not found")

    if activity.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only update your own activity"
        )

    if title:
        activity.title = title
    if content:
        activity.content = content
    if max_score:
        activity.max_score = int(max_score)
    if category:
        activity.category = category
    if term:
        activity.term = term

    if file and getattr(file, "filename", ""):
        # delete old file
        if activity.file_url:
            filename = extract_filename_from_url(activity.file_url)
            delete_file_from_supabase(filename)

        # upload new file
        destination_name = f"activities_{activity.subject_id}_{file.filename}"
        file_url = upload_file_to_supabase(file, destination_name)

        # upload new file url in db
        activity.file_url = file_url

    db.commit()
    db.refresh(activity)

    # real-time push + save in DB
    await notify_students(activity.subject_id, "Activity Updated", f"{activity.title} has been updated.", db)

    return activity


# delete post in activity
@router.delete("/{activity_id}")
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="activity not found")

    if activity.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own activity"
        )

    if activity.file_url:
        filename = extract_filename_from_url(activity.file_url)
        delete_file_from_supabase(filename)

    db.delete(activity)
    db.commit()

    

    return {"message": "activity deleted successfully"}
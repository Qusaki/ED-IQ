from typing import List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.subject import Subject, SubjectEnrollment
from models.activity import Activity
from schemas.activity import ActivityResponse
# from utils.gcs import upload_file_to_gcs
from dependencies import get_current_user

router = APIRouter()

#route to create activity post
@router.post("/{subject_id}", response_model=ActivityResponse)
async def create_activity(
    subject_id: str,
    title: str = Form(...),
    content: str = Form(None),
    file: UploadFile = File(None),
    max_score: int = Form(100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user) # teacher must be logged in
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the subject owner can create Activity")    

    
    file_url = None
   # if file:
   #     destination_name = f"lectures/{current_user.id}/{file.filename}"
   #     file_url = upload_file_to_gcs(file, destination_name)

    activity = Activity(
        id=str(uuid4()),
        title=title,
        content=content,
        file_url=file_url,
        max_score=max_score,
        teacher_id=current_user.id,
        subject_id=subject_id
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    return activity

# view all activity in subject
@router.get("/{subject_id}", response_model=List[ActivityResponse])
async def get_activity_by_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Ensure the user is either the subject owner or an approved student
    enrolled = db.query(SubjectEnrollment).filter(SubjectEnrollment.subject_id == subject_id, SubjectEnrollment.student_id == current_user.id, SubjectEnrollment.status == "approved").first()
    if (subject.owner_id != current_user.id) and (not enrolled):
        raise HTTPException(status_code=403, detail="You do not have access to this subject's Activities")
    
    activities = db.query(Activity).filter(Activity.subject_id == subject_id).order_by(Activity.created_at.desc()).all()

    if not activities:
        raise HTTPException(status_code=404, detail="no activities found in this subject")
    return activities

# edit post in activity
@router.put("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: str,
    title: str = Form(None),
    content: str = Form(None),
    max_score: int = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="activity not found")

    if activity.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own activity")
    
    if title:
        activity.title = title
    if content:
        activity.content = content
    if max_score is not None:
        activity.max_score = max_score

    # if file:
    #     destination_name = f"activities/{current_user.id}/{file.filename}"
    #     file_url = upload_file_to_gcs(file, destination_name)

    db.commit()
    db.refresh(activity)

    return activity

# delete post in activity
@router.delete("/{activity_id}")
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="activity not found")
    
    if activity.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own activity")

    db.delete(activity)
    db.commit()

    return {"message": "activity deleted successfully"}
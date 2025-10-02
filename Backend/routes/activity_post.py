from typing import List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user) # teacher must be logged in
):
    # Ensure the user is a teacher
    if current_user.role != 'teacher':
        raise HTTPException(status_code=403, detail="Only teachers can create activities")

    file_url = None
   # if file:
   #     destination_name = f"lectures/{current_user.id}/{file.filename}"
   #     file_url = upload_file_to_gcs(file, destination_name)

    activity = Activity(
        id=str(uuid4()),
        title=title,
        content=content,
        file_url=file_url,
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
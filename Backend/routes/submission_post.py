from typing import List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.activity import Activity
from models.submission import Submission
from schemas.submission import SubmissionResponse
# from utils.gcs import upload_file_to_gcs
from dependencies import get_current_user

router = APIRouter()

#route to create submission post
@router.post("/{activity_id}", response_model=SubmissionResponse)
async def create_submission(
    activity_id: str,
    content: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user) # student must be logged in
):
    # Ensure the user is a student
    if current_user.role != 'student':
        raise HTTPException(status_code=403, detail="Only student can submit")

    file_url = None
   # if file:
   #     destination_name = f"lectures/{current_user.id}/{file.filename}"
   #     file_url = upload_file_to_gcs(file, destination_name)

    submit = Submission(
        id=str(uuid4()),
        content=content,
        file_url=file_url,
        student_id=current_user.id,
        activity_id=activity_id
    )
    db.add(submit)
    db.commit()
    db.refresh(submit)

    return submit

# view all submit in activity
@router.get("/{activity_id}", response_model=List[SubmissionResponse])
async def get_submit_by_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    submissions = db.query(Submission).filter(Submission.activity_id == activity_id).order_by(Submission.created_at.desc()).all()

    if not submissions:
        raise HTTPException(status_code=404, detail="no submissions found in this activity")
    return submissions

# edit post in submited activity
@router.put("/{submission_id}", response_model=SubmissionResponse)
async def update_submission(
    submission_id: str,
    content: str = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()

    if not submission:
        raise HTTPException(status_code=404, detail="activity not found")

    if submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own activity")
    
    if content:
        Submission.content = content

    db.commit()
    db.refresh(submission)

    return submission

# delete post in activity
@router.delete("/{submission_id}")
def delete_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()

    if not submission:
        raise HTTPException(status_code=404, detail="activity not found")
    
    if Submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own activity")

    db.delete(submission)
    db.commit()

    return {"message": "student activity deleted successfully"}

# score submission
@router.put("/score/{submission_id}", response_model=SubmissionResponse)
async def score_submission(
    submission_id: str,
    score: int = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # get the submission post
    submission = db.query(Submission).filter(Submission.id == submission_id).first()

    if not submission:
        raise HTTPException(status_code=404, detail="submission not found")
    
    # get the activity post
    activity = db.query(Activity).filter(Activity.id == submission.activity_id).first()
    
    # Ensure the user is owner of the activity
    if current_user.id != activity.teacher_id:
        raise HTTPException(status_code=403, detail="Only the owner of the activity can score submissions")
    
    if score < 0 or  score > activity.max_score:
        raise HTTPException(status_code=400, detail=f"Score must be between 0 and {activity.max_score}")
    
    submission.score = score

    db.commit()
    db.refresh(submission)

    return submission
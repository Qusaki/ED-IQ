from typing import List
from uuid import uuid4

from database import get_db
from dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from models.activity import Activity
from models.submission import Submission
from models.subject import Subject, SubjectEnrollment
from schemas.submission import (
    SubmissionResponse,
    SubmissionScore,
    SubmissionScoreUpdate,
)
from schemas.user import UserResponse
from sqlalchemy.orm import Session

router = APIRouter()

# fetch all students in a subject
@router.get("/students/{subject_id}", response_model=List[UserResponse])
def fetch_all_students(
    subject_id: str,
    db: Session = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    students = db.query(SubjectEnrollment).filter(SubjectEnrollment.subject_id == subject.id, SubjectEnrollment.status == "approved").all()

    if not students:
        raise HTTPException(statud_code=404, detail="no student found in this subject")

    return students


# this is to score their offline work
@router.post("/score/{activity_id}", response_model=List[SubmissionResponse])
def grade_students_all_at_once(
    activity_id: str,
    activity_grade: List[SubmissionScore],
    db: Session = Depends(get_current_user),
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    new_grades = []

    for grade in activity_grade:
        if grade.score < 0:
            raise HTTPException(
                status_code=400, detail="Score for student cannot be negative."
            )

        if grade.score > activity.max_score:
            raise HTTPException(
                status_code=400,
                detail=f"Score for student exceeds total score ({activity.max_score})",
            )

        existing = (
            db.query(Submission)
            .filter(
                Submission.activity_id == activity.id,
                Submission.student_id == grade.student_id,
            )
            .first()
        )

        if existing:
            existing.score = grade.score
            new_grades.append(existing)
        else:
            new_grade = Submission(
                id=str(uuid4()),
                activity_id=activity.id,
                student_id=grade.student_id,
                score=grade.score,
            )
            db.add(new_grade)
            new_grades.append(new_grade)

    db.commit()

    for grade in new_grades:
        db.refresh(grade)

    return new_grades


# get all grades for an activity
@router.get("/{activity_id}", response_model=List[SubmissionResponse])
def get_activity_grades(activity_id: str, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    grades = db.query(Submission).filter(Submission.activity_id == activity.id).all()

    return grades


# update student grade
@router.put("/{activity_id}/{student_id}", response_model=SubmissionResponse)
def update_student_grade(
    activity_id: str,
    student_id: str,
    grade_update: SubmissionScoreUpdate,
    db: Session = Depends(get_db),
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    grade = (
        db.query(Submission)
        .filter(
            Submission.activity_id == activity_id, Submission.student_id == student_id
        )
        .first()
    )

    if not grade:
        raise HTTPException(
            status_code=404, detail="Grade not found for this student and activity"
        )

    if grade_update.score is not None:
        if grade_update.score < 0:
            raise HTTPException(status_code=400, detail="Score cannot be negative")

        if grade_update.score > activity.max_score:
            raise HTTPException(
                status_code=400,
                detail=f"Score exceeds total score ({activity.max_score})",
            )

        grade.score = grade_update.score

    db.commit()
    db.refresh(grade)

    return grade
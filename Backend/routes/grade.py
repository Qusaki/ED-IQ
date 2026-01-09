from uuid import uuid4

from database import get_db
from dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from models.grade import Grade
from models.subject import Subject, SubjectEnrollment
from models.user import User
from schemas.grade import GradeResponse
from sqlalchemy.orm import Session
from utils.gradecomputation import compute_semestral_grade

router = APIRouter()


# Get current student's grade for a subject
@router.get("/current/{subject_id}", response_model=dict)
def get_current_student_grade(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Check if user is enrolled as a student
    enrolled = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.student_id == current_user.id,
            SubjectEnrollment.status == "approved",
        )
        .first()
    )
    
    if not enrolled:
        raise HTTPException(
            status_code=403, detail="You are not enrolled in this subject"
        )

    # Compute the student's grade
    try:
        semestral_grade = compute_semestral_grade(current_user.id, subject_id, db)
        
        # Check if grade exists in database
        existing = (
            db.query(Grade)
            .filter(Grade.student_id == current_user.id, Grade.subject_id == subject_id)
            .first()
        )

        if existing:
            # Update existing grade
            existing.score = semestral_grade
            db.commit()
            db.refresh(existing)
            grade_id = existing.id
        else:
            # Create new grade record
            grade = Grade(
                id=str(uuid4()),
                student_id=current_user.id,
                subject_id=subject_id,
                score=semestral_grade,
            )
            db.add(grade)
            db.commit()
            db.refresh(grade)
            grade_id = grade.id

        return {
            "id": grade_id,
            "student_id": current_user.id,
            "subject_id": subject_id,
            "score": semestral_grade,
        }
    except Exception as e:
        # If computation fails, return a default grade
        return {
            "id": None,
            "student_id": current_user.id,
            "subject_id": subject_id,
            "score": 0.0,
        }


# auto compute grade then save to database
@router.get("/{student_id}/{subject_id}", response_model=dict)
def auto_compute_grade(
    student_id: str,
    subject_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrolled = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.student_id == student_id,
            SubjectEnrollment.status == "approved",
        )
        .first()
    )
    if not enrolled:
        raise HTTPException(
            status_code=403, detail="You are not enrolled in this subject"
        )

    if (subject.owner_id != current_user.id) and (not enrolled):
        raise HTTPException(
            status_code=403, detail="You do not have access to this subject Grade"
        )

    semestral_grade = compute_semestral_grade(student_id, subject_id, db)

    existing = (
        db.query(Grade)
        .filter(Grade.student_id == student_id, Grade.subject_id == subject_id)
        .first()
    )

    if existing:
        existing.score = semestral_grade

        db.commit()
        db.refresh(existing)

        return {
            "id": existing.id,
            "student_id": existing.student_id,
            "subject_id": existing.subject_id,
            "score": existing.score,
        }

    grade = Grade(
        id=str(uuid4()),
        student_id=student_id,
        subject_id=subject_id,
        score=semestral_grade,
    )

    db.add(grade)
    db.commit()
    db.refresh(grade)

    return {
        "id": grade.id,
        "student_id": grade.student_id,
        "subject_id": grade.subject_id,
        "score": grade.score,
    }

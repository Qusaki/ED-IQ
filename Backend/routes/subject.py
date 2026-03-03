import random
import string
from typing import List
from uuid import uuid4

from database import get_db
from dependencies import get_current_user, required_role
from fastapi import APIRouter, Depends, Form, HTTPException
from models.subject import EnrollmentStatus, Subject, SubjectEnrollment
from models.user import User
from schemas.enrollment import (
    EnrollmentActionResponse,
    StudentInSubject,
    SubjectEnrollmentResponse,
)
from schemas.subject import SubjectCreate, SubjectJoin, SubjectResponse
from sqlalchemy.orm import Session
from utils.notify import notify_user  # Added notify_user

router = APIRouter()


# Utility function to generate a unique subject code
def generate_unique_code(db: Session, length: int = 6) -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
        exists = db.query(Subject).filter(Subject.code == code).first()
        if not exists:
            return code


# Route to create a new subject (teacher only)
@router.post("", response_model=SubjectResponse)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher")),
):
    # Create a new subject with a unique code
    subject = Subject(
        id=str(uuid4()),
        name=payload.name.strip(),
        code=generate_unique_code(db),
        owner_id=current_user.id,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("", response_model=List[SubjectResponse])
def list_subjects(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # List subjects based on user role
    if current_user.role == "teacher":
        subjects = db.query(Subject).filter(Subject.owner_id == current_user.id).all()
        for subject in subjects:
            subject.teacher_name = current_user.name
        return subjects

    # Student view: list enrolled subjects
    enrollments = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.student_id == current_user.id,
            SubjectEnrollment.status == EnrollmentStatus.APPROVED.value,
        )
        .all()
    )
    subject_ids = [e.subject_id for e in enrollments]

    # Return empty list if no enrollments
    if not subject_ids:
        return []
    
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    for subject in subjects:
        owner = db.query(User).filter(User.id == subject.owner_id).first()
        if owner:
            subject.teacher_name = owner.name
            
    return subjects


@router.post("/join", response_model=SubjectResponse)
async def join_subject(
    payload: SubjectJoin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("student")),
):
    # Student joins a subject by name
    subject = (
        db.query(Subject).filter(Subject.code == payload.code.strip().upper()).first()
    )
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    existing = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject.id,
            SubjectEnrollment.student_id == current_user.id,
        )
        .first()
    )
    if existing:
        return subject  # Already enrolled

    enrollment = SubjectEnrollment(
        id=str(uuid4()),
        subject_id=subject.id,
        student_id=current_user.id,
        status=EnrollmentStatus.PENDING.value,
    )
    db.add(enrollment)
    db.commit()

    # Notify the teacher about the enrollment request
    await notify_user(
        user_id=subject.owner_id,
        title=f"{subject.name} - Request",
        message=f"{current_user.name} wants to enroll",
        db=db,
        subject_id=subject.id,
    )

    return subject


@router.get("/{subject_id}/students", response_model=List[StudentInSubject])
def get_subject_students(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher")),
):
    # Get students enrolled in a subject (teacher only)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    enrollments = (
        db.query(SubjectEnrollment)
        .filter(SubjectEnrollment.subject_id == subject_id)
        .all()
    )

    out: List[StudentInSubject] = []
    for e in enrollments:
        student = db.query(User).filter(User.id == e.student_id).first()
        if student:
            out.append(
                StudentInSubject(
                    id=student.id,
                    name=student.name,
                    email=student.email,
                    status=e.status,
                    profile_picture=student.profile_picture,
                )
            )
    return out


@router.post(
    "/{subject_id}/students/{student_id}/accept",
    response_model=EnrollmentActionResponse,
)
async def accept_student(
    subject_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher")),
):
    # Accept a student's enrollment request (teacher only)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    enrollment = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.student_id == student_id,
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment.status = EnrollmentStatus.APPROVED.value
    db.commit()
    # Notify the student
    await notify_user(
        user_id=student_id,
        title="Enrollment Accepted",
        message=f"Your enrollment request for subject '{subject.name}' has been accepted!",
        db=db,
    )
    return EnrollmentActionResponse(success=True, message="Student accepted")


@router.post(
    "/{subject_id}/students/{student_id}/reject",
    response_model=EnrollmentActionResponse,
)
async def reject_student(
    subject_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher")),
):
    # Reject a student's enrollment request (teacher only)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    enrollment = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.student_id == student_id,
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment.status = EnrollmentStatus.REJECTED.value
    db.commit()
    # Notify the student
    await notify_user(
        user_id=student_id,
        title="Enrollment Rejected",
        message=f"Your enrollment request for subject '{subject.name}' has been rejected.",
        db=db,
    )
    return EnrollmentActionResponse(success=True, message="Student rejected")


@router.get("/{subject_id}/status", response_model=SubjectEnrollmentResponse)
def get_student_subject_status(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("student")),
):
    # Get the enrollment status of the current student for a specific subject
    enrollment = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.student_id == current_user.id,
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    return SubjectEnrollmentResponse(
        status=enrollment.status, subject_id=enrollment.subject_id
    )


# to edit the subject details
@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: str,
    name: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher")),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subjet not founded")
    if subject.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="only owner of the subejct can edit"
        )

    if name:
        subject.name = name.strip()
        db.commit()
        db.refresh(subject)
        return subject
    else:
        raise HTTPException(status_code=400, detail="Name is required")

    db.commit()
    db.refresh(subject)

    return subject


# to delete the subject
@router.delete("/{subject_id}", response_model=SubjectResponse)
def delete_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher")),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subjet not founded")
    if subject.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="only owner of the subejct can delete"
        )

    db.delete(subject)
    db.commit()
    return subject

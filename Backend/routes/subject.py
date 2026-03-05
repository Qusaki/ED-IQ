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
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "owner_id": subject.owner_id,
        "teacher_name": current_user.name,
    }


@router.get("", response_model=List[SubjectResponse])
def list_subjects(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # List subjects based on user role
    if current_user.role == "teacher":
        subjects = db.query(Subject).filter(Subject.owner_id == current_user.id).all()
        out = []
        for subject in subjects:
            out.append({
                "id": subject.id,
                "name": subject.name,
                "code": subject.code,
                "owner_id": subject.owner_id,
                "teacher_name": current_user.name
            })
        return out

    # Student view: list enrolled subjects
    try:
        enrollments = (
            db.query(SubjectEnrollment)
            .filter(
                SubjectEnrollment.student_id == current_user.id,
                SubjectEnrollment.status == EnrollmentStatus.APPROVED.value,
            )
            .all()
        )
    except Exception as e:
        print(f"[ERROR] Failed to query subject enrollments: {str(e)}")
        return []
    subject_ids = [e.subject_id for e in enrollments]

    # Return empty list if no enrollments
    if not subject_ids:
        return []
    
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    out = []
    for subject in subjects:
        owner = db.query(User).filter(User.id == subject.owner_id).first()
        out.append({
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
            "owner_id": subject.owner_id,
            "teacher_name": owner.name if owner else None
        })
            
    return out


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
    existing = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject.id,
            SubjectEnrollment.student_id == current_user.id,
        )
        .first()
    )
    if existing:
        print(f"[DEBUG] Student already enrolled in {subject.name}")
        return subject

    print(f"[DEBUG] Creating enrollment for subject {subject.id} student {current_user.id}")
    enrollment = SubjectEnrollment(
        id=str(uuid4()),
        subject_id=subject.id,
        student_id=current_user.id,
        status=EnrollmentStatus.PENDING.value,
    )
    db.add(enrollment)
    try:
        db.commit()
        print(f"[DEBUG] Enrollment committed successfully")
    except Exception as commit_err:
        print(f"[ERROR] Database commit failed for enrollment: {str(commit_err)}")
        raise


    # get owner to include teacher_name
    owner = db.query(User).filter(User.id == subject.owner_id).first()
    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "owner_id": subject.owner_id,
        "teacher_name": owner.name if owner else None,
    }


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
                    created_at=e.created_at,
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
        return {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
            "owner_id": subject.owner_id,
            "teacher_name": current_user.name,
        }
    else:
        raise HTTPException(status_code=400, detail="Name is required")

    db.commit()
    db.refresh(subject)

    return {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "owner_id": subject.owner_id,
        "teacher_name": current_user.name,
    }


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

    # Create a copy or a response model dictionary before deleting the subject
    subject_dict = {
        "id": subject.id,
        "name": subject.name,
        "code": subject.code,
        "owner_id": subject.owner_id
    }
    
    db.delete(subject)
    db.commit()
    
    return subject_dict
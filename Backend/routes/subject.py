import random, string
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import required_role, get_current_user
from models.subject import Subject, SubjectEnrollment, EnrollmentStatus
from schemas.subject_create import SubjectCreate
from schemas.subject_join import SubjectJoin
from schemas.subject_response import SubjectResponse
from schemas.enrollment import AcceptedRejectedResponse, StudentInSubject, SubjectEnrollmentResponse
from typing import List
from models.user import User

router = APIRouter()

# Utility function to generate a unique subject code
def generate_unique_code(db: Session, length: int = 6) -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        exists = db.query(Subject).filter(Subject.code == code).first()
        if not exists:
            return code
        

# Route to create a new subject (teacher only)    
@router.post("", response_model=SubjectResponse)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher"))
):
    # Create a new subject with a unique code
    subject = Subject(
        id=str(uuid4()),
        name=payload.name.strip(),
        code=generate_unique_code(db),
        owner_id=current_user.id
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.get("", response_model=List[SubjectResponse])
def list_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # List subjects based on user role
    if current_user.role == "teacher":
        return db.query(Subject).filter(Subject.owner_id == current_user.id).all()
        
    # Student view: list enrolled subjects
    enrollments = db.query(SubjectEnrollment).filter(
        SubjectEnrollment.student_id == current_user.id,
        SubjectEnrollment.status == EnrollmentStatus.APPROVED.value
    ).all()
    subject_ids = [e.subject_id for e in enrollments]

    # Return empty list if no enrollments
    if not subject_ids:
        return []
    return db.query(Subject).filter(Subject.id.in_(subject_ids)).all()

@router.post("/join", response_model=SubjectResponse)
def join_subject(
    payload: SubjectJoin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("student"))
):
    # Student joins a subject by name
    subject = db.query(Subject).filter(Subject.code == payload.code.strip().upper()).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    existing = db.query(SubjectEnrollment).filter(
        SubjectEnrollment.subject_id == subject.id,
        SubjectEnrollment.student_id == current_user.id
    ).first()
    if existing:
        return subject  # Already enrolled
    
    enrollment = SubjectEnrollment(
        id=str(uuid4()),
        subject_id=subject.id,
        student_id=current_user.id,
        status=EnrollmentStatus.PENDING.value
    )
    db.add(enrollment)
    db.commit()
    return subject

@router.get("/{subject_id}/students", response_model=List[StudentInSubject])
def get_subject_students(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher"))
):
    # Get students enrolled in a subject (teacher only)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    enrollments = db.query(SubjectEnrollment).filter(SubjectEnrollment.subject_id == subject_id).all()
    
    out: List[StudentInSubject] = []
    for e in enrollments:
        student = db.query(User).filter(User.id == e.student_id).first()
        if student:
            out.append(StudentInSubject(
                id=student.id,
                name=student.name,
                email=student.email,
                status=e.status
            ))
    return out

@router.post("/{subject_id}/students/{student_id}/accept", response_model=AcceptedRejectedResponse)
def accept_student(
    subject_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher"))
):
    # Accept a student's enrollment request (teacher only)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    enrollment = db.query(SubjectEnrollment).filter(
        SubjectEnrollment.subject_id == subject_id,
        SubjectEnrollment.student_id == student_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment.status = EnrollmentStatus.APPROVED.value
    db.commit()
    return AcceptedRejectedResponse(success=True, message="Student accepted")

@router.post("/{subject_id}/students/{student_id}/reject", response_model=AcceptedRejectedResponse)
def reject_student(
    subject_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("teacher"))
):
    # Reject a student's enrollment request (teacher only)
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    enrollment = db.query(SubjectEnrollment).filter(
        SubjectEnrollment.subject_id == subject_id,
        SubjectEnrollment.student_id == student_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment.status = EnrollmentStatus.REJECTED.value
    db.commit()
    return AcceptedRejectedResponse(success=True, message="Student rejected")

@router.get("/{subject_id}/status", response_model=SubjectEnrollmentResponse)
def get_student_subject_status(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role=Depends(required_role("student"))
):
    # Get the enrollment status of the current student for a specific subject
    enrollment = db.query(SubjectEnrollment).filter(
        SubjectEnrollment.subject_id == subject_id,
        SubjectEnrollment.student_id == current_user.id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return SubjectEnrollmentResponse(
        status=enrollment.status,
        subject_id=enrollment.subject_id
    )
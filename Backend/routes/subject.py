import random, string
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import required_role, get_current_user
from models.subject import Subject, SubjectEnrollment
from schemas.subject_create import SubjectCreate
from schemas.subject_join import SubjectJoin
from schemas.subject_response import SubjectResponse
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
    enrollments = db.query(SubjectEnrollment).filter(SubjectEnrollment.student_id == current_user.id).all()
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
        student_id=current_user.id
    )
    db.add(enrollment)
    db.commit()
    return subject
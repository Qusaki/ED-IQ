from uuid import uuid4

from database import get_db
from dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from models.grade import Grade
from models.subject import Subject, SubjectEnrollment
from models.user import User
from schemas.grade import GradeResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from utils.gradecomputation import compute_semestral_grade, compute_class_standing, compute_major_exam
from models.activity import Activity
from models.submission import Submission

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


# Get all grades for all students in a subject
@router.get("/all/{subject_id}", response_model=list[dict])
def get_all_student_grades(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the teacher can view all grades"
        )

    # Pre-fetch all enrolled students
    enrollments = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.status == "approved",
        )
        .all()
    )
    student_ids = [e.student_id for e in enrollments]
    
    if not student_ids:
        return []

    # Pre-fetch all activities
    activities = db.query(Activity).filter(Activity.subject_id == subject_id).all()
    activity_map = {a.id: a for a in activities}

    # Pre-fetch all submissions for these activities
    submissions = ()
    if activities:
        submissions = db.query(Submission).filter(
            Submission.activity_id.in_(list(activity_map.keys()))
        ).all()
    
    # Map submissions: (student_id, activity_id) -> submission
    sub_map = {}
    for s in submissions:
        sub_map[(s.student_id, s.activity_id)] = s

    # Computation helper for in-memory data
    def calc_period(s_id, term):
        lab_score, quiz_score, assignment_score, attendance_score = [], [], [], []
        lab_max, quiz_max, assignment_max, attendance_max = [], [], [], []
        
        major_exam, lab_exam, project = None, None, None
        major_exam_total, lab_exam_total, project_total = None, None, None
        
        term_acts = [a for a in activities if a.term == term]
        if not term_acts:
            return None # no activities = no grade yet

        for activity in term_acts:
            submission = sub_map.get((s_id, activity.id))
            
            if activity.category == "laboratory":
                if submission:
                    lab_score.append(submission.score or 0)
                lab_max.append(activity.max_score)
            elif activity.category == "quiz":
                if submission:
                    quiz_score.append(submission.score or 0)
                quiz_max.append(activity.max_score)
            elif activity.category == "assignment":
                if submission:
                    assignment_score.append(submission.score or 0)
                assignment_max.append(activity.max_score)
            elif activity.category == "attendance":
                if submission:
                    attendance_score.append(submission.score or 0)
                attendance_max.append(activity.max_score)
            elif activity.category == "major exam":
                if submission:
                    major_exam = submission.score or 0
                major_exam_total = activity.max_score
            elif activity.category == "lab exam":
                if submission:
                    lab_exam = submission.score or 0
                lab_exam_total = activity.max_score
            elif activity.category == "project":
                if submission:
                    project = submission.score or 0
                project_total = activity.max_score

        class_standing_score, class_standing_weight = compute_class_standing(
            lab_score, quiz_score, assignment_score, attendance_score,
            lab_max, quiz_max, assignment_max, attendance_max
        )

        exam_score, exam_weight = compute_major_exam(
            major_exam, lab_exam, project, major_exam_total, lab_exam_total, project_total
        )

        total_score = class_standing_score + exam_score
        total_possible_weight = class_standing_weight + exam_weight

        if total_possible_weight == 0:
            return 0
        return total_score / total_possible_weight

    results = []
    # Calculate for each student
    for sid in student_ids:
        mid_grade = calc_period(sid, "midterm")
        fin_grade = calc_period(sid, "final")
        
        if mid_grade is None:
            mid_grade = 0.0
            sem_grade = 0.0
        elif fin_grade is None:
            sem_grade = mid_grade
        else:
            sem_grade = (mid_grade + fin_grade) / 2
            
        results.append({
            "student_id": sid,
            "subject_id": subject_id,
            "score": sem_grade
        })
        
    return results

from database import get_db
from fastapi import Depends, HTTPException
from models.activity import Activity
from models.subject import Subject
from models.submission import Submission
from models.user import User
from sqlalchemy.orm import Session


def compute_class_standing(
    lab_exercise,
    quiz,
    assignment,
    attendance,
    lab_max,
    quiz_max,
    assignment_max,
    attendance_max,
):
    """
    laboratory exercises = 30%
    quizzes = 10%
    assignments = 5%
    attendance = 5%
    """

    lab_score = sum(lab_exercise)
    quiz_score = sum(quiz)
    assignment_score = sum(assignment)
    attendance_score = sum(attendance)

    lab_total = sum(lab_max)
    quiz_total = sum(quiz_max)
    assignment_total = sum(assignment_max)
    attendance_total = sum(attendance_max)

    if lab_total == 0:
        lab_percent = 0
        lab_weight = 0
    else:
        lab_percent = (lab_score / lab_total) * 100
        lab_weight = 0.3

    if quiz_total == 0:
        quiz_percent = 0
        quiz_weight = 0
    else:
        quiz_percent = (quiz_score / quiz_total) * 100
        quiz_weight = 0.1

    if assignment_total == 0:
        assignment_percent = 0
        assignment_weight = 0
    else:
        assignment_percent = (assignment_score / assignment_total) * 100
        assignment_weight = 0.05

    if attendance_total == 0:
        attendance_percent = 0
        attendance_weight = 0
    else:
        attendance_percent = (attendance_score / attendance_total) * 100
        attendance_weight = 0.05

    final_score = (
        (lab_percent * 0.3)
        + (quiz_percent * 0.1)
        + (assignment_percent * 0.05)
        + (attendance_percent * 0.05)
    )

    possible_weight = lab_weight + quiz_weight + assignment_weight + attendance_weight

    return final_score, possible_weight


def compute_major_exam(
    major_exam, lab_exam, project, major_exam_total, lab_exam_total, project_total
):
    """
    major exam = 20%
    perf/lab exam = 25%
    project = 5%
    """

    if major_exam_total == 0 or major_exam_total is None:
        major_exam_percent = 0
        major_exam_weight = 0
    else:
        major_exam_percent = (major_exam / major_exam_total) * 100
        major_exam_weight = 0.2

    if lab_exam_total == 0 or lab_exam_total is None:
        lab_exam_percent = 0
        lab_exam_weight = 0
    else:
        lab_exam_percent = (lab_exam / lab_exam_total) * 100
        lab_exam_weight = 0.25

    if project_total == 0 or project_total is None:
        project_percent = 0
        project_weight = 0
    else:
        project_percent = (project / project_total) * 100
        project_weight = 0.05

    final_score = (
        (major_exam_percent * 0.2)
        + (lab_exam_percent * 0.25)
        + (project_percent * 0.05)
    )

    possible_weight = major_exam_weight + lab_exam_weight + project_weight

    return final_score, possible_weight


def compute_period_grade(
    student_id: str, subject_id: str, db: Session, term: str
):
    """
    Generic function to compute grade for a specific term (midterm/final) 
    using optimized queries.
    """
    activities = db.query(Activity).filter(
        Activity.subject_id == subject_id, 
        Activity.term == term
    ).all()

    if not activities:
        return None  # No activities found

    activity_ids = [a.id for a in activities]
    
    # Batch query submissions for this student and these activities
    submissions = db.query(Submission).filter(
        Submission.student_id == student_id,
        Submission.activity_id.in_(activity_ids)
    ).all()
    
    sub_map = {s.activity_id: s for s in submissions}

    lab_score, quiz_score, assignment_score, attendance_score = [], [], [], []
    lab_max, quiz_max, assignment_max, attendance_max = [], [], [], []

    major_exam, lab_exam, project = 0, 0, 0
    major_exam_total, lab_exam_total, project_total = 0, 0, 0

    for activity in activities:
        submission = sub_map.get(activity.id)
        score = submission.score if submission else 0

        if activity.category == "laboratory":
            lab_score.append(score)
            lab_max.append(activity.max_score or 100)
        elif activity.category == "quiz":
            quiz_score.append(score)
            quiz_max.append(activity.max_score or 100)
        elif activity.category == "assignment":
            assignment_score.append(score)
            assignment_max.append(activity.max_score or 100)
        elif activity.category == "attendance":
            attendance_score.append(score)
            attendance_max.append(activity.max_score or 100)
        elif activity.category == "major exam":
            major_exam = score
            major_exam_total = activity.max_score or 100
        elif activity.category == "lab exam":
            lab_exam = score
            lab_exam_total = activity.max_score or 100
        elif activity.category == "project":
            project = score
            project_total = activity.max_score or 100

    class_standing_score, class_standing_weight = compute_class_standing(
        lab_score, quiz_score, assignment_score, attendance_score,
        lab_max, quiz_max, assignment_max, attendance_max,
    )

    exam_score, exam_weight = compute_major_exam(
        major_exam, lab_exam, project, major_exam_total, lab_exam_total, project_total
    )

    total_score = class_standing_score + exam_score
    total_possible_weight = class_standing_weight + exam_weight

    if total_possible_weight == 0:
        return 0

    return total_score / total_possible_weight


def compute_midterm_grade(
    student_id: str, subject_id: str, db: Session = Depends(get_db)
):
    grade = compute_period_grade(student_id, subject_id, db, "midterm")
    if grade is None:
        raise HTTPException(status_code=404, detail="no activities found for midterm")
    return grade


def compute_final_grade(
    student_id: str, subject_id: str, db: Session = Depends(get_db)
):
    grade = compute_period_grade(student_id, subject_id, db, "final")
    if grade is None:
        raise HTTPException(status_code=404, detail="no activities found for final")
    return grade


def compute_semestral_grade(
    student_id: str, subject_id: str, db: Session = Depends(get_db)
):
    midterm = compute_period_grade(student_id, subject_id, db, "midterm") or 0
    final = compute_period_grade(student_id, subject_id, db, "final")
    
    if final is None:
        return midterm
    
    return (midterm + final) / 2
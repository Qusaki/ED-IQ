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

    lab_percent = (lab_score / lab_total) * 100
    quiz_percent = (quiz_score / quiz_total) * 100
    assignment_percent = (assignment_score / assignment_total) * 100
    attendance_percent = (attendance_score / attendance_total) * 100

    final_score = (
        (lab_percent * 0.3)
        + (quiz_percent * 0.1)
        + (assignment_percent * 0.05)
        + (attendance_percent * 0.05)
    )

    return final_score


def compute_major_exam(
    major_exam, lab_exam, project, major_exam_total, lab_exam_total, project_total
):
    """
    major exam = 20%
    perf/lab exam = 25%
    project = 5%
    """

    major_exam_percent = (major_exam / major_exam_total) * 100
    lab_exam_percent = (lab_exam / lab_exam_total) * 100
    project_percent = (project / project_total) * 100

    final_score = (
        (major_exam_percent * 0.2)
        + (lab_exam_percent * 0.25)
        + (project_percent * 0.05)
    )

    return final_score


def compute_midterm_grade(
    student_id: str, subject_id: str, db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    student = db.query(User).filter(User.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    grades = (
        db.query(Submission)
        .join(Activity, Activity.id == Submission.activity_id)
        .filter(
            Submission.student_id == student_id,
            Activity.subject_id == subject_id,
        )
        .all()
    )

    if not grades:
        raise HTTPException(
            status_code=404, detail="No grades found for the given student and subject."
        )

    lab_score, quiz_score, assignment_score, attendance_score = [], [], [], []
    lab_max, quiz_max, assignment_max, attendance_max = [], [], [], []

    major_exam, lab_exam, project = None, None, None
    major_exam_total, lab_exam_total, project_total = None, None, None

    for grade in grades:
        activity = db.query(Activity).filter(Activity.id == grade.activity_id).first()
        if not activity:
            continue

        if activity.category == "laboratory":
            lab_score.append(grade.score)
            lab_max.append(activity.max_score)
        elif activity.category == "quiz":
            quiz_score.append(grade.score)
            quiz_max.append(activity.max_score)
        elif activity.category == "assignment":
            assignment_score.append(grade.score)
            assignment_max.append(activity.max_score)
        elif activity.category == "attendance":
            attendance_score.append(grade.score)
            attendance_max.append(activity.max_score)

        elif activity.category == "major exam":
            major_exam = grade.score
            major_exam_total = activity.max_score
        elif activity.category == "lab exam":
            lab_exam = grade.score
            lab_exam_total = activity.max_score
        elif activity.category == "project":
            project = grade.score
            project_total = activity.max_score

    class_standing_score = compute_class_standing(
        lab_score,
        quiz_score,
        assignment_score,
        attendance_score,
        lab_max,
        quiz_max,
        assignment_max,
        attendance_max,
    )

    exam_score = compute_major_exam(
        major_exam, lab_exam, project, major_exam_total, lab_exam_total, project_total
    )

    midterm_grade = class_standing_score + exam_score

    return midterm_grade


def compute_final_grade(
    student_id: str, subject_id: str, db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    student = db.query(User).filter(User.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    grades = (
        db.query(Submission)
        .join(Activity, Activity.id == Submission.activity_id)
        .filter(
            Submission.student_id == student_id,
            Activity.subject_id == subject_id,
        )
        .all()
    )

    if not grades:
        raise HTTPException(
            status_code=404, detail="No grades found for the given student and subject."
        )

    lab_score, quiz_score, assignment_score, attendance_score = [], [], [], []
    lab_max, quiz_max, assignment_max, attendance_max = [], [], [], []

    major_exam, lab_exam, project = None, None, None
    major_exam_total, lab_exam_total, project_total = None, None, None

    for grade in grades:
        activity = db.query(Activity).filter(Activity.id == grade.activity_id).first()
        if not activity:
            continue

        if activity.category == "laboratory":
            lab_score.append(grade.score)
            lab_max.append(activity.max_score)
        elif activity.category == "quiz":
            quiz_score.append(grade.score)
            quiz_max.append(activity.max_score)
        elif activity.category == "assignment":
            assignment_score.append(grade.score)
            assignment_max.append(activity.max_score)
        elif activity.category == "attendance":
            attendance_score.append(grade.score)
            attendance_max.append(activity.max_score)

        elif activity.category == "major exam":
            major_exam = grade.score
            major_exam_total = activity.max_score
        elif activity.category == "lab exam":
            lab_exam = grade.score
            lab_exam_total = activity.max_score
        elif activity.category == "project":
            project = grade.score
            project_total = activity.max_score

    class_standing_score = compute_class_standing(
        lab_score,
        quiz_score,
        assignment_score,
        attendance_score,
        lab_max,
        quiz_max,
        assignment_max,
        attendance_max,
    )

    exam_score = compute_major_exam(
        major_exam, lab_exam, project, major_exam_total, lab_exam_total, project_total
    )

    final_grade = class_standing_score + exam_score

    return final_grade


def compute_semestral_grade(
    student_id: str, subject_id: str, db: Session = Depends(get_db)
):
    midterm = compute_midterm_grade(student_id, subject_id, db)
    final = compute_final_grade(student_id, subject_id, db)

    semestral_grade = (midterm + final) / 2

    return semestral_grade

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
    else:
        lab_percent = (lab_score / lab_total) * 100

    if quiz_total == 0:
        quiz_percent = 0
    else:
        quiz_percent = (quiz_score / quiz_total) * 100

    if assignment_total == 0:
        assignment_percent = 0
    else:
        assignment_percent = (assignment_score / assignment_total) * 100

    if attendance_total == 0:
        attendance_percent = 0
    else:
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

    if major_exam_total == 0 or major_exam_total is None:
        major_exam_percent = 0
    else:
        major_exam_percent = (major_exam / major_exam_total) * 100

    if lab_exam_total == 0 or lab_exam_total is None:
        lab_exam_percent = 0
    else:
        lab_exam_percent = (lab_exam / lab_exam_total) * 100

    if project_total == 0 or project_total is None:
        project_percent = 0
    else:
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

    activities = db.query(Activity).filter(Activity.subject_id == subject_id, Activity.term == "midterm").all()

    if not activities:
        raise HTTPException(status_code=404, detail="no activities found for the given subject")


    lab_score, quiz_score, assignment_score, attendance_score = [], [], [], []
    lab_max, quiz_max, assignment_max, attendance_max = [], [], [], []

    major_exam, lab_exam, project = None, None, None
    major_exam_total, lab_exam_total, project_total = None, None, None

    for activity in activities:

        submission = db.query(Submission).filter(Submission.activity_id == activity.id, Submission.student_id == student.id).first()

        if activity.category == "laboratory":
            if submission:
                lab_score.append(submission.score)
            lab_max.append(activity.max_score)
        elif activity.category == "quiz":
            if submission:
                quiz_score.append(submission.score)
            quiz_max.append(activity.max_score)
        elif activity.category == "assignment":
            if submission:
                assignment_score.append(submission.score)
            assignment_max.append(activity.max_score)
        elif activity.category == "attendance":
            if submission:
                attendance_score.append(submission.score)
            attendance_max.append(activity.max_score)

        elif activity.category == "major exam":
            if submission:
                major_exam = submission.score
            major_exam_total = activity.max_score
        elif activity.category == "lab exam":
            if submission:
                lab_exam = submission.score
            lab_exam_total = activity.max_score
        elif activity.category == "project":
            if submission:
                project = submission.score
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

    activities = db.query(Activity).filter(Activity.subject_id == subject_id, Activity.term == "final").all()

    if not activities:
        raise HTTPException(status_code=404, detail="no activities found for the given subject")

    lab_score, quiz_score, assignment_score, attendance_score = [], [], [], []
    lab_max, quiz_max, assignment_max, attendance_max = [], [], [], []

    major_exam, lab_exam, project = None, None, None
    major_exam_total, lab_exam_total, project_total = None, None, None

    for activity in activities:

        submission = db.query(Submission).filter(Submission.activity_id == activity.id, Submission.student_id == student.id).first()

        if activity.category == "laboratory":
            if submission:
                lab_score.append(submission.score)
            lab_max.append(activity.max_score)
        elif activity.category == "quiz":
            if submission:
                quiz_score.append(submission.score)
            quiz_max.append(activity.max_score)
        elif activity.category == "assignment":
            if submission:
                assignment_score.append(submission.score)
            assignment_max.append(activity.max_score)
        elif activity.category == "attendance":
            if submission:
                attendance_score.append(submission.score)
            attendance_max.append(activity.max_score)

        elif activity.category == "major exam":
            if submission:
                major_exam = submission.score
            major_exam_total = activity.max_score
        elif activity.category == "lab exam":
            if submission:
                lab_exam = submission.score
            lab_exam_total = activity.max_score
        elif activity.category == "project":
            if submission:
                project = submission.score
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
    try:
        final = compute_final_grade(student_id, subject_id, db)
    except HTTPException as e:
        if e.status_code == 404:
            return midterm
        raise
    
    semestral_grade = (midterm + final) / 2

    return semestral_grade

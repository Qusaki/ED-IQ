from uuid import uuid4

from models.notification import Notification
from models.subject import SubjectEnrollment
from models.activity import Activity
from models.user import User
from utils.websocket_manager import manager


async def notify_students(subject_id: str, title: str, message: str, db):
    enrolled = (
        db.query(SubjectEnrollment)
        .filter(
            SubjectEnrollment.subject_id == subject_id,
            SubjectEnrollment.status == "approved",
        )
        .all()
    )

    for e in enrolled:
        notif = Notification(
            id=str(uuid4()),
            user_id=e.student_id,
            title=title,
            message=message,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        await manager.send_personal(
            e.student_id,
            {
                "type": "notification",
                "title": title,
                "message": message,
                "created_at": str(notif.created_at),
                "id": notif.id,
            },
        )


async def notify_teacher(subject_id: str, activity_id: str, student_id: str, title: str, message: str, db):
    # Get the subject to find the teacher (owner)
    from models.subject import Subject
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return
    
    # Get the student name for personalized message
    student = db.query(User).filter(User.id == student_id).first()
    student_name = student.name if student else "A student"
    
    # Create notification for the teacher
    notif = Notification(
        id=str(uuid4()),
        user_id=subject.owner_id,
        title=title,
        message=message,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Send real-time notification via WebSocket
    await manager.send_personal(
        subject.owner_id,
        {
            "type": "notification",
            "title": title,
            "message": message,
            "created_at": str(notif.created_at),
            "id": notif.id,
        },
    )

async def notify_user(user_id: str, title: str, message: str, db, subject_id: str = None):
    notif = Notification(
        id=str(uuid4()),
        user_id=user_id,
        title=title,
        message=message,
        subject_id=subject_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    await manager.send_personal(
        user_id,
        {
            "type": "notification",
            "title": title,
            "message": message,
            "created_at": str(notif.created_at),
            "id": notif.id,
            "subject_id": subject_id,
        },
    )

from uuid import uuid4

from models.notification import Notification
from models.subject import SubjectEnrollment
from models.activity import Activity
from models.user import User
from utils.websocket_manager import manager


async def notify_students(subject_id: str, title: str, message: str, db, activity_id: str = None, lecture_id: str = None):
    try:
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
                subject_id=subject_id,
                activity_id=activity_id,
                lecture_id=lecture_id,
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)

            payload = {
                "type": "notification",
                "title": title,
                "message": message,
                "created_at": str(notif.created_at),
                "id": notif.id,
                "subject_id": subject_id,
            }
            if activity_id:
                payload["activity_id"] = activity_id
            if lecture_id:
                payload["lecture_id"] = lecture_id

            await manager.send_personal(e.student_id, payload)
    except Exception as e:
        print(f"[NOTIFY_STUDENTS ERROR] Failed to notify students for subject {subject_id}: {str(e)}")
        import traceback
        traceback.print_exc()


async def notify_teacher(subject_id: str, activity_id: str, student_id: str, title: str, message: str, db):
    try:
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
            subject_id=subject_id,
            activity_id=activity_id,
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
                "subject_id": subject_id,
                "activity_id": activity_id,
            },
        )
    except Exception as e:
        print(f"[NOTIFY_TEACHER ERROR] Failed to notify teacher for subject {subject_id}: {str(e)}")
        import traceback
        traceback.print_exc()

async def notify_user(user_id: str, title: str, message: str, db, subject_id: str = None, activity_id: str = None, lecture_id: str = None):
    try:
        print(f"[NOTIFY_USER] Creating notification for user {user_id}: {title}")
        notif = Notification(
            id=str(uuid4()),
            user_id=user_id,
            title=title,
            message=message,
            subject_id=subject_id,
            activity_id=activity_id,
            lecture_id=lecture_id,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        print(f"[NOTIFY_USER] Notification created in DB with ID: {notif.id}, subject_id: {subject_id}")

        print(f"[NOTIFY_USER] Sending via WebSocket to user {user_id}")
        payload = {
            "type": "notification",
            "title": title,
            "message": message,
            "created_at": str(notif.created_at),
            "id": notif.id,
            "subject_id": subject_id,
        }
        if activity_id:
            payload["activity_id"] = activity_id
        if lecture_id:
            payload["lecture_id"] = lecture_id

        await manager.send_personal(user_id, payload)
        print(f"[NOTIFY_USER] WebSocket notification sent successfully")
    except Exception as e:
        print(f"[NOTIFY_USER ERROR] Failed to notify user {user_id}: {str(e)}")
        import traceback
        traceback.print_exc()

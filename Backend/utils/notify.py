from uuid import uuid4
from models.notification import Notification
from models.subject import SubjectEnrollment
from models.activity import Activity
from models.subject import Subject
from models.user import User
from utils.websocket_manager import manager

async def notify_students(subject_id: str, title: str, message: str, db, activity_id: str = None, lecture_id: str = None):
    from utils.email import send_notification_email
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
            
            # Send email notification
            student_user = db.query(User).filter(User.id == e.student_id).first()
            if student_user and student_user.email:
                send_notification_email(student_user.email, title, message)

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
    from utils.email import send_notification_email
    try:
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            return
        
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

        # Send email notification to teacher
        teacher_user = db.query(User).filter(User.id == subject.owner_id).first()
        if teacher_user and teacher_user.email:
            send_notification_email(teacher_user.email, title, message)

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
    from utils.email import send_notification_email
    try:
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

        # Send email notification
        target_user = db.query(User).filter(User.id == user_id).first()
        if target_user and target_user.email:
            send_notification_email(target_user.email, title, message)

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
    except Exception as e:
        print(f"[NOTIFY_USER ERROR] Failed to notify user {user_id}: {str(e)}")
        import traceback
        traceback.print_exc()

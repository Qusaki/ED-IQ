from uuid import uuid4

from models.notification import Notification
from models.subject import SubjectEnrollment
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

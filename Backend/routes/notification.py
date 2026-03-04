from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas.notification import NotificationResponse
from models.notification import Notification
from dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=list[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        notif = db.query(Notification).filter(
            Notification.user_id == current_user.id
        ).order_by(Notification.created_at.desc()).all()
        return notif
    except Exception as e:
        print(f"[ERROR] Failed to fetch notifications (possibly pending db migration): {str(e)}")
        # If the query crashes (e.g. missing subject_id column), return an empty list
        # instead of throwing a 500 server error that breaks the whole student interface.
        return []

@router.put("/{notif_id}/read")
def mark_as_read(notif_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(404, "Notification not found")

    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}

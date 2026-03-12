import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")

def send_email(to_email: str, subject: str, html_content: str):
    """Internal helper to send email via Resend."""
    if not resend.api_key:
        print(f"[EMAIL ERROR] RESEND_API_KEY not set. Cannot send email to {to_email}")
        return False
    
    try:
        params = {
            "from": f"ED-IQ <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        resend.Emails.send(params)
        print(f"[EMAIL SUCCESS] sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email to {to_email}: {str(e)}")
        return False

def send_password_reset_email(to_email: str, token: str):
    """Send password reset link to user."""
    # Note: frontend URL should ideally come from env var
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:19006") 
    reset_link = f"{frontend_url}/reset-password?token={token}"
    
    html = f"""
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password. Click the link below to set a new one:</p>
    <a href="{reset_link}">{reset_link}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    """
    return send_email(to_email, "ED-IQ Password Reset", html)

def send_notification_email(to_email: str, title: str, message: str):
    """Send in-app notification content via email."""
    html = f"""
    <h1>{title}</h1>
    <p>{message}</p>
    <p>Check your ED-IQ app for more details.</p>
    """
    return send_email(to_email, f"ED-IQ Notification: {title}", html)

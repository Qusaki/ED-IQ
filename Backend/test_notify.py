import asyncio
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Bypass dotenv relying on local paths and hardcode the SQLite file path for the test
db_path = os.path.join(os.path.dirname(__file__), "database.db")
DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from utils.notify import notify_students
from models.subject import Subject

async def test():
    db = SessionLocal()
    try:
        subject = db.query(Subject).first()
        if subject:
            print("Found subject:", subject.id)
            await notify_students(subject.id, "Test API", "Test MSG", db, activity_id="123")
            print("Notify success!")
        else:
            print("No subjects")
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test())

from fastapi import FastAPI
from models.base import Base
from routes import auth, protected, user_management, subject
from database import engine

app = FastAPI()

app.include_router(auth.router, prefix='/auth')
app.include_router(protected.router, prefix='/protected')
app.include_router(user_management.router, prefix='/user_management')
app.include_router(subject.router, prefix='/subjects')

Base.metadata.create_all(engine)
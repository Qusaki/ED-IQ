from fastapi import APIRouter
from utils.chatbot import student_handbook


router = APIRouter()

@router.post("/handbook")
async def handbook_chatbot(message: str):
    response = student_handbook(message)
    return {"response": response}
    

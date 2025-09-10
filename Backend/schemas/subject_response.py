from pydantic import BaseModel

class SubjectResponse(BaseModel):
    id: str
    name: str
    code: str
    owner_id: str

    class Config:
        orm_mode = True
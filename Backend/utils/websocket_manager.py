from typing import Dict, List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.connections:
            self.connections[user_id] = []
        self.connections[user_id].append(websocket)
    
    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.connections:
            self.connections[user_id].remove(websocket)
            if len(self.connections[user_id]) == 0:
                del self.connections[user_id]

    async def send_personal(self, user_id: str, data: dict):
        if user_id in self.connections:
            for ws in self.connections[user_id]:
                await ws.send_text(json.dumps(data))

manager = ConnectionManager()
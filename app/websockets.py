from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from app.database import SessionLocal, Chat, ChatMember, Message, User
from app.security import get_current_user, SECRET_KEY, ALGORITHM
from typing import Dict
from jose import jwt, JWTError

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, chat_id: int, user_id: int):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = {}
        self.active_connections[chat_id][user_id] = websocket

    def disconnect(self, chat_id: int, user_id: int):
        if chat_id in self.active_connections and user_id in self.active_connections[chat_id]:
            del self.active_connections[chat_id][user_id]

    async def broadcast(self, message: str, chat_id: int):
        if chat_id in self.active_connections:
            for user_id, connection in self.active_connections[chat_id].items():
                await connection.send_text(message)


manager = ConnectionManager()


async def get_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = db.query(User).filter(User.email == email).first()
        return user
    except JWTError:
        return None


@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: int, token: str = Query(...)):
    db = SessionLocal()
    user = await get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008)
        db.close()
        return

    chat = db.query(Chat).filter(Chat.chat_id == chat_id).first()
    if not chat:
        await websocket.close(code=1008)
        db.close()
        return

    membership = db.query(ChatMember).filter(ChatMember.chat_id == chat_id, ChatMember.user_id == user.user_id).first()
    if not membership:
        await websocket.close(code=1008)
        db.close()
        return

    await manager.connect(websocket, chat_id, user.user_id)

    try:
        while True:
            text = await websocket.receive_text()

            # Создаем новую сессию для транзакции
            trans_db = SessionLocal()
            try:
                msg = Message(chat_id=chat_id, sender_id=user.user_id, content=text)
                trans_db.add(msg)
                trans_db.commit()
            finally:
                trans_db.close()

            message_to_send = f'{{"user": "{user.full_name}", "text": "{text}"}}'
            await manager.broadcast(message_to_send, chat_id)

    except WebSocketDisconnect:
        manager.disconnect(chat_id, user.user_id)
    finally:
        db.close()
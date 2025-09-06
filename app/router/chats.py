from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import database, schemas
from app.security import get_current_user

router = APIRouter(
    prefix="/chats",
    tags=["chats"]
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.ChatResponse)
def create_chat(chat: schemas.ChatCreate, db: Session = Depends(get_db),
                current_user: database.User = Depends(get_current_user)):
    if current_user.user_id not in chat.member_ids:
        chat.member_ids.append(current_user.user_id)

    # Убираем дубликаты, если есть
    member_ids = sorted(list(set(chat.member_ids)))

    is_group = len(member_ids) > 2
    chat_name = chat.name

    if not is_group:
        # Для личных чатов проверяем, не существует ли уже такой чат
        # Это сложная логика, пока для простоты оставим возможность создавать дубликаты
        other_user_id = next((uid for uid in member_ids if uid != current_user.user_id), None)
        if other_user_id:
            other_user = db.query(database.User).filter(database.User.user_id == other_user_id).first()
            if not chat_name:
                chat_name = f"{current_user.full_name}, {other_user.full_name}"

    db_chat = database.Chat(name=chat_name, is_group=is_group)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)

    for user_id in member_ids:
        member = database.ChatMember(chat_id=db_chat.chat_id, user_id=user_id)
        db.add(member)
    db.commit()

    db.refresh(db_chat)
    return db_chat


@router.post("/role-chat", response_model=schemas.ChatResponse)
def create_role_chat(chat_data: schemas.RoleChatCreate, db: Session = Depends(get_db),
                     current_user: database.User = Depends(get_current_user)):
    """Создает групповой чат для всех пользователей с указанной ролью."""
    users_with_role = db.query(database.User).filter(database.User.role == chat_data.role).all()
    member_ids = [user.user_id for user in users_with_role]

    # Добавляем создателя, если его нет в списке
    if current_user.user_id not in member_ids:
        member_ids.append(current_user.user_id)

    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="Недостаточно участников для создания чата по роли")

    # Используем уже существующую логику создания чата
    chat_create_schema = schemas.ChatCreate(name=chat_data.name, member_ids=member_ids)
    return create_chat(chat=chat_create_schema, db=db, current_user=current_user)


@router.get("/", response_model=List[schemas.ChatResponse])
def get_user_chats(db: Session = Depends(get_db), current_user: database.User = Depends(get_current_user)):
    chat_memberships = db.query(database.ChatMember).filter(database.ChatMember.user_id == current_user.user_id).all()
    chat_ids = [membership.chat_id for membership in chat_memberships]

    chats = db.query(database.Chat).filter(database.Chat.chat_id.in_(chat_ids)).all()
    return chats


@router.get("/{chat_id}/messages")
def get_chat_messages(chat_id: int, db: Session = Depends(get_db),
                      current_user: database.User = Depends(get_current_user)):
    membership = db.query(database.ChatMember).filter(database.ChatMember.chat_id == chat_id,
                                                      database.ChatMember.user_id == current_user.user_id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    messages = db.query(database.Message).filter(database.Message.chat_id == chat_id).order_by(
        database.Message.timestamp).all()
    return [{"user": m.sender.full_name, "text": m.content, "timestamp": m.timestamp} for m in messages]
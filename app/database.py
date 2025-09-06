import enum
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Boolean, Text, DateTime, Enum
from sqlalchemy.orm import sessionmaker, relationship, DeclarativeBase
from datetime import datetime


class RoleEnum(str, enum.Enum):
    student = "Студент"
    teacher = "Преподаватель"
    admin = "Администратор"

DATABASE_URL = "sqlite:///./messenger.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    # ИЗМЕНЕНО: поле role теперь использует Enum
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.student)
    group = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    messages_sent = relationship("Message", back_populates="sender", foreign_keys='Message.sender_id', cascade="all, delete-orphan")
    chat_memberships = relationship("ChatMember", back_populates="user", cascade="all, delete-orphan")

class Chat(Base):
    __tablename__ = "chats"
    chat_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    members = relationship("ChatMember", back_populates="chat", cascade="all, delete-orphan")

class ChatMember(Base):
    __tablename__ = "chat_members"
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.chat_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    role_in_chat = Column(String, nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    chat = relationship("Chat", back_populates="members")
    user = relationship("User", back_populates="chat_memberships")

class Message(Base):
    __tablename__ = "messages"
    message_id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.chat_id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User", back_populates="messages_sent", foreign_keys='Message.sender_id')


def init_db():
    Base.metadata.create_all(bind=engine)
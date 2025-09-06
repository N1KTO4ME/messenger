from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from app.database import RoleEnum, ChatMember # НОВОЕ

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    role: RoleEnum

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(UserBase):
    user_id: int
    role: RoleEnum

    class Config:
        from_attributes = True

# Chat Schemas
class ChatCreate(BaseModel):
    name: Optional[str] = None
    member_ids: List[int]

# НОВАЯ схема для создания чата по роли
class RoleChatCreate(BaseModel):
    role: RoleEnum
    name: str


class ChatResponse(BaseModel):
    chat_id: int
    name: Optional[str]
    is_group: bool
    members: List[UserResponse]

    class Config:
        from_attributes = True

    # Этот валидатор автоматически извлекает объекты User из ChatMember
    @field_validator('members', mode='before')
    @classmethod
    def extract_users_from_chat_members(cls, v):
        if v and isinstance(v[0], ChatMember):
            return [member.user for member in v]
        return v


# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
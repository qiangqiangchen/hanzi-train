from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserProgress, UserSettings
from ..schemas import UserCreate, Token, UserProfile
from ..auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已被注册")

    new_user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        display_name=user_data.display_name or "小小探险家",
    )
    db.add(new_user)
    db.flush()  # 获取 id

    # 自动创建关联数据
    db.add(UserProgress(user_id=new_user.id))
    db.add(UserSettings(user_id=new_user.id))
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.id})
    return Token(
        access_token=token,
        user_id=new_user.id,
        username=new_user.username,
    )


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="用户名或密码错误")

    token = create_access_token(data={"sub": user.id})
    return Token(
        access_token=token,
        user_id=user.id,
        username=user.username,
    )


@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user
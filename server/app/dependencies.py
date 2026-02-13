"""公共依赖"""
from .database import get_db
from .auth import get_current_user, get_optional_user

# 导出供 routers 使用
__all__ = ["get_db", "get_current_user", "get_optional_user"]
import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

bearer_scheme = HTTPBearer(auto_error=False)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)
def hash_password(password: str):
    return pwd_context.hash(password)
def verify_password(password: str, password_hash: str):
    return pwd_context.verify(password, password_hash)


def get_jwt_secret_key() -> str:
    secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY environment variable must be set")

    return secret_key


def create_access_token(user_id: int) -> str:
    secret_key = get_jwt_secret_key()

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(payload, secret_key, algorithm=ALGORITHM)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> int:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise credentials_exception

    try:
        payload = jwt.decode(
            credentials.credentials,
            get_jwt_secret_key(),
            algorithms=[ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise credentials_exception

    if user_id < 1:
        raise credentials_exception

    return user_id

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import verify_password, create_access_token
from schemas import Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token", response_model=Token, summary="Login — get JWT token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Standard OAuth2 password flow.
    - **username**: your registered email address
    - **password**: your password
    """
    user: User | None = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

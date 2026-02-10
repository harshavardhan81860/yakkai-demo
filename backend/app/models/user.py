from sqlalchemy.orm import declarative_base, mapped_column
from sqlalchemy import String, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.base import Base


#ase = declarative_base()

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keycloak_id = mapped_column(String, unique=True, nullable=False)   # Keycloak UUID

    email = mapped_column(String, unique=True, nullable=False)
    username = mapped_column(String, unique=True, nullable=True)

    first_name = mapped_column(String, nullable=True)
    last_name = mapped_column(String, nullable=True)

    mobile = mapped_column(String, nullable=True)
    department = mapped_column(String, nullable=True)
    gender = mapped_column(String, nullable=True)

    is_active = mapped_column(Boolean, default=True)

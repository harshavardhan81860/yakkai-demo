from sqlalchemy import  String
from db.base_class import Base
from sqlalchemy.orm import mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Component(Base):
    __tablename__ = "components"
    __table_args__ = {"schema": "data"}

    id = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = mapped_column(String(255))

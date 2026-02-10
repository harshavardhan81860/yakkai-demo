# utils/serializer.py

def orm_to_dict(obj):
    """
    Convert SQLAlchemy ORM object into a clean dictionary.
    Works for all models.
    """
    if obj is None:
        return None

    return {
        column.name: getattr(obj, column.name)
        for column in obj.__table__.columns
    }

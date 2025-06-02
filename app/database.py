from sqlmodel import create_engine, SQLModel, Session
from decouple import config

# Get database configuration
DATABASE_URL = config('DATABASE_URL', cast=str, default='sqlite:///./bookapi.db')

# Create database engine
engine = create_engine(str(DATABASE_URL), echo=True)
# SQLModel.metadata.create_all(engine)

# Get database session
def get_session():
    with Session(engine) as session:
        yield session

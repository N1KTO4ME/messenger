from app.database import engine

print("Disposing database engine connections...")
engine.dispose()
print("Database engine connections disposed.")
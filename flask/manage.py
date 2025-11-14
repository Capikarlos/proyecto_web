from app import app
from models import db, Usuario

with app.app_context():
    db.create_all()
    print("Tablas creadas/aseguradas.")

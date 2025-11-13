import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambiaestoenproduccion")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://usuario:password@dbhost:5432/proyecto_web2"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

import os
from urllib.parse import quote_plus

DB_USER = "miusuario"
DB_PASS = quote_plus("capi123")
DB_HOST = "localhost"
DB_NAME = "proyecto_web2"

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambiaestoenproduccion")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

import os
from urllib.parse import quote_plus

DB_USER = "carlos_user"
DB_PASS = quote_plus("12345")

#DB_HOST = "localhost"
DB_HOST = "192.168.1.83"

DB_NAME = "proyecto_web"

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambiaestoenproduccion")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime


db = SQLAlchemy()

class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre_usuario = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)  # texto plano (RIESGO DE SEGURIDAD)
    email = db.Column(db.String(100), nullable=False)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)
    rol = db.Column(db.String(20))
    nombre_completo = db.Column(db.String(100))
    biografia = db.Column(db.Text)

    def set_password(self, raw):
        # guarda la contraseña tal cual (texto plano)
        self.password = raw

    def check_password(self, raw):
        # comparación simple texto vs texto (sin hashing)
        return self.password == raw


class Producto(db.Model):
    __tablename__ = 'productos'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    precio = db.Column(db.Numeric(10,2), nullable=False)
    stock = db.Column(db.Integer)
    img = db.Column(db.String(500))
    categoria = db.Column(db.String(500))


class Compra(db.Model):
    __tablename__ = 'compras'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Numeric(10,2))
    estado = db.Column(db.String(20), default='pendiente')
    fecha = db.Column(db.DateTime, default=datetime.utcnow)

    usuario = db.relationship('Usuario', backref='compras')
    producto = db.relationship('Producto', backref='compras')
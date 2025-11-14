from flask import Flask, render_template, request, redirect, url_for, flash, send_file
from config import Config
from models import db, Usuario, Producto, Compra
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from io import BytesIO
from datetime import datetime
import decimal

# PDF
try:
    # Intenta importar weasyprint para generar PDF
    from weasyprint import HTML
    WEASY = True
except Exception as e:
    # Si falla, marca como no disponible
    WEASY = False

# Inicialización de la aplicación Flask
app = Flask(__name__)
# Configuración desde el archivo config.py
app.config.from_object(Config)
# Inicialización de la base de datos
db.init_app(app)

# Configuración de Flask-Login
login_manager = LoginManager()
login_manager.login_view = 'login' # Vista a la que se redirige si no está logueado
login_manager.init_app(app)

# Función de callback para cargar usuarios por ID
@login_manager.user_loader
def load_user(user_id):
    # Carga un usuario a partir de su ID para Flask-Login
    # Nota: El Query.get() es legacy, se recomienda usar db.session.get(Usuario, int(user_id)) en SQLAlchemy 2.0
    return Usuario.query.get(int(user_id))

# Decorador personalizado para restringir el acceso a administradores
def admin_required(func):
    from functools import wraps
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Verifica si el usuario está autenticado
        if not current_user.is_authenticated:
            return login_manager.unauthorized()
        # Verifica si el rol es 'admin'
        if current_user.rol != 'admin':
            flash("Acceso denegado: se requieren privilegios de administrador.", "danger")
            return redirect(url_for('index'))
        return func(*args, **kwargs)
    return wrapper

# Ruta principal (Home)
@app.route('/')
def index():
    # Renderiza la plantilla base
    return render_template('base.html')

# Rutas de login
@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        nombre = request.form.get('username')
        password = request.form.get('password')
        # Busca el usuario por nombre
        user = Usuario.query.filter_by(nombre_usuario=nombre).first()
        # Verifica usuario y contraseña (en models.py la verificación es en texto plano)
        if user and user.check_password(password):
            login_user(user) # Inicia sesión
            return redirect(url_for('reports_form')) # Redirige al formulario de reportes
        flash('Usuario o contraseña incorrecta', 'danger') # Muestra error
    return render_template('login.html')

# Rutas de logout
@app.route('/logout')
@login_required # Requiere que el usuario esté logueado
def logout():
    logout_user() # Cierra sesión
    return redirect(url_for('login'))

# Formulario de reportes (solo para admin)
@app.route('/reports', methods=['GET'])
@login_required
@admin_required
def reports_form():
    # Obtiene todos los productos para el filtro
    productos = Producto.query.order_by(Producto.nombre).all()
    # Obtiene categorías únicas
    categorias = db.session.query(Producto.categoria).distinct().all()
    categorias = [c[0] for c in categorias if c[0]] # Limpia la lista de tuplas
    return render_template('reports_form.html', productos=productos, categorias=categorias)

# Función auxiliar para parsear fechas
def parse_date(dstr):
    if not dstr:
        return None
    try:
        # Esperamos formato yyyy-mm-dd
        return datetime.strptime(dstr, "%Y-%m-%d")
    except:
        return None

# Ruta para ver el reporte en la web
@app.route('/reports/view', methods=['POST'])
@login_required
@admin_required
def reports_view():
    # Leer filtros
    date_from = parse_date(request.form.get('date_from'))
    date_to = parse_date(request.form.get('date_to'))
    
    # FIX: Asegura que product_id es None si no se seleccionó nada o es la cadena 'None'
    product_id_raw = request.form.get('product_id')
    product_id = product_id_raw if product_id_raw and product_id_raw != 'None' else None
    
    categoria = request.form.get('categoria') or None
    group_by = request.form.get('group_by') or 'product'  # 'product', 'category', 'date'

    # Construir query base, uniendo Compra y Producto
    q = db.session.query(Compra, Producto).join(Producto, Compra.producto_id == Producto.id)

    # Aplicar filtros de fecha
    if date_from:
        q = q.filter(Compra.fecha >= date_from)
    if date_to:
        # incluir hasta el final del día date_to
        q = q.filter(Compra.fecha <= date_to.replace(hour=23, minute=59, second=59))
    
    # Aplicar filtro de producto
    if product_id:
        # La conversión a int() solo se ejecuta si product_id tiene un valor numérico válido
        q = q.filter(Compra.producto_id == int(product_id))
    
    # Aplicar filtro de categoría
    if categoria:
        q = q.filter(Producto.categoria == categoria)

    rows = q.all()  # lista de (Compra, Producto) tuplas

    # Generar agregados según group_by
    report = {}
    total_amount = decimal.Decimal('0.00')
    total_items = 0

    if group_by == 'product':
        for compra, producto in rows:
            key = f"{producto.id} - {producto.nombre}"
            if key not in report:
                report[key] = {'cantidad': 0, 'ventas': decimal.Decimal('0.00')}
            report[key]['cantidad'] += compra.cantidad
            report[key]['ventas'] += (compra.total or 0)
            total_amount += (compra.total or 0)
            total_items += compra.cantidad
    elif group_by == 'category':
        for compra, producto in rows:
            key = producto.categoria or 'Sin categoría'
            if key not in report:
                report[key] = {'cantidad': 0, 'ventas': decimal.Decimal('0.00')}
            report[key]['cantidad'] += compra.cantidad
            report[key]['ventas'] += (compra.total or 0)
            total_amount += (compra.total or 0)
            total_items += compra.cantidad
    else:  # group_by == 'date'
        for compra, producto in rows:
            key = compra.fecha.strftime("%Y-%m-%d")
            if key not in report:
                report[key] = {'cantidad': 0, 'ventas': decimal.Decimal('0.00')}
            report[key]['cantidad'] += compra.cantidad
            report[key]['ventas'] += (compra.total or 0)
            total_amount += (compra.total or 0)
            total_items += compra.cantidad

    # Ordenar report por ventas descendente
    report_list = sorted(
        [{'grupo': k, 'cantidad': v['cantidad'], 'ventas': float(v['ventas'])} for k, v in report.items()],
        key=lambda x: x['ventas'],
        reverse=True
    )

    # Guardar los filtros para poder generar PDF con mismos datos
    filters = {
        'date_from': request.form.get('date_from'),
        'date_to': request.form.get('date_to'),
        'product_id': product_id,
        'categoria': categoria,
        'group_by': group_by
    }

    return render_template('reports_view.html',
                            report=report_list,
                            total_amount=float(total_amount),
                            total_items=total_items,
                            filters=filters,
                            generated_on=datetime.utcnow())

# Ruta para descargar el reporte como PDF
@app.route('/reports/download', methods=['POST'])
@login_required
@admin_required
def reports_download():
    # Extraemos los mismos filtros del formulario
    date_from = parse_date(request.form.get('date_from'))
    date_to = parse_date(request.form.get('date_to'))
    
    # FIX: Asegura que product_id es None si no se seleccionó nada o es la cadena 'None'
    product_id_raw = request.form.get('product_id')
    product_id = product_id_raw if product_id_raw and product_id_raw != 'None' else None
    
    categoria = request.form.get('categoria') or None
    group_by = request.form.get('group_by') or 'product'

    # Lógica de consulta (duplicada de reports_view, puede ser factorizada)
    q = db.session.query(Compra, Producto).join(Producto, Compra.producto_id == Producto.id)
    if date_from:
        q = q.filter(Compra.fecha >= date_from)
    if date_to:
        q = q.filter(Compra.fecha <= date_to.replace(hour=23, minute=59, second=59))
    
    if product_id:
        q = q.filter(Compra.producto_id == int(product_id))
    
    if categoria:
        q = q.filter(Producto.categoria == categoria)

    rows = q.all()

    report = {}
    total_amount = decimal.Decimal('0.00')
    total_items = 0

    if group_by == 'product':
        for compra, producto in rows:
            key = f"{producto.id} - {producto.nombre}"
            if key not in report:
                report[key] = {'cantidad': 0, 'ventas': decimal.Decimal('0.00')}
            report[key]['cantidad'] += compra.cantidad
            report[key]['ventas'] += (compra.total or 0)
            total_amount += (compra.total or 0)
            total_items += compra.cantidad
    elif group_by == 'category':
        for compra, producto in rows:
            key = producto.categoria or 'Sin categoría'
            if key not in report:
                report[key] = {'cantidad': 0, 'ventas': decimal.Decimal('0.00')}
            report[key]['cantidad'] += compra.cantidad
            report[key]['ventas'] += (compra.total or 0)
            total_amount += (compra.total or 0)
            total_items += compra.cantidad
    else:
        for compra, producto in rows:
            key = compra.fecha.strftime("%Y-%m-%d")
            if key not in report:
                report[key] = {'cantidad': 0, 'ventas': decimal.Decimal('0.00')}
            report[key]['cantidad'] += compra.cantidad
            report[key]['ventas'] += (compra.total or 0)
            total_amount += (compra.total or 0)
            total_items += compra.cantidad

    report_list = sorted(
        [{'grupo': k, 'cantidad': v['cantidad'], 'ventas': float(v['ventas'])} for k, v in report.items()],
        key=lambda x: x['ventas'],
        reverse=True
    )

    # Renderizar template HTML del PDF
    html = render_template('report_pdf.html',
                            report=report_list,
                            total_amount=float(total_amount),
                            total_items=total_items,
                            filters={
                                'date_from': request.form.get('date_from'),
                                'date_to': request.form.get('date_to'),
                                'product_id': product_id,
                                'categoria': categoria,
                                'group_by': group_by
                            },
                            generated_on=datetime.utcnow(),
                            user=current_user)

    if WEASY:
        # Generar PDF y enviarlo
        pdf = HTML(string=html).write_pdf()
        return send_file(BytesIO(pdf), mimetype='application/pdf', as_attachment=True, download_name='reporte_ventas.pdf')
    else:
        # Fallback si WeasyPrint no está instalado
        flash("WeasyPrint no está instalado en el servidor. Se descargará el HTML ( imprime como PDF desde tu navegador ).", "warning")
        return render_template('report_pdf.html',
                                report=report_list,
                                total_amount=float(total_amount),
                                total_items=total_items,
                                filters={
                                    'date_from': request.form.get('date_from'),
                                    'date_to': request.form.get('date_to'),
                                    'product_id': product_id,
                                    'categoria': categoria,
                                    'group_by': group_by
                                },
                                generated_on=datetime.utcnow(),
                                user=current_user)

# Comando CLI para crear un administrador fácilmente
@app.cli.command('create-admin')
def create_admin():
    username = input("Nombre de usuario admin: ")
    email = input("Email del admin: ")
    pw = input("Password: ")
    u = Usuario(nombre_usuario=username, email=email, rol='admin')
    u.set_password(pw) # Guarda la contraseña en texto plano
    db.session.add(u)
    db.session.commit()
    print("Admin creado.")

if __name__ == '__main__':
    app.run(debug=True)
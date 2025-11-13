from flask import Flask, render_template, request, redirect, url_for, flash, send_file
from config import Config
from models import db, Usuario, Producto, Compra
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from io import BytesIO
from datetime import datetime
import decimal

# PDF
try:
    from weasyprint import HTML
    WEASY = True
except Exception as e:
    WEASY = False

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))

def admin_required(func):
    from functools import wraps
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return login_manager.unauthorized()
        if current_user.rol != 'admin':
            flash("Acceso denegado: se requieren privilegios de administrador.", "danger")
            return redirect(url_for('index'))
        return func(*args, **kwargs)
    return wrapper

@app.route('/')
def index():
    return render_template('base.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        nombre = request.form.get('username')
        password = request.form.get('password')
        user = Usuario.query.filter_by(nombre_usuario=nombre).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('reports_form'))
        flash('Usuario o contraseña incorrecta', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/reports', methods=['GET'])
@login_required
@admin_required
def reports_form():
    productos = Producto.query.order_by(Producto.nombre).all()
    categorias = db.session.query(Producto.categoria).distinct().all()
    categorias = [c[0] for c in categorias if c[0]]
    return render_template('reports_form.html', productos=productos, categorias=categorias)

def parse_date(dstr):
    if not dstr:
        return None
    try:
        # Esperamos formato yyyy-mm-dd
        return datetime.strptime(dstr, "%Y-%m-%d")
    except:
        return None

@app.route('/reports/view', methods=['POST'])
@login_required
@admin_required
def reports_view():
    # Leer filtros
    date_from = parse_date(request.form.get('date_from'))
    date_to = parse_date(request.form.get('date_to'))
    product_id = request.form.get('product_id') or None
    categoria = request.form.get('categoria') or None
    group_by = request.form.get('group_by') or 'product'  # 'product', 'category', 'date'

    # Construir query base
    q = db.session.query(Compra, Producto).join(Producto, Compra.producto_id == Producto.id)

    if date_from:
        q = q.filter(Compra.fecha >= date_from)
    if date_to:
        # incluir todo el día date_to
        q = q.filter(Compra.fecha <= date_to.replace(hour=23, minute=59, second=59))
    if product_id:
        q = q.filter(Compra.producto_id == int(product_id))
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

@app.route('/reports/download', methods=['POST'])
@login_required
@admin_required
def reports_download():
    # Reusar la lógica de filtrado: para simplicidad volvemos a llamar al endpoint que genera los datos
    # Extraemos los mismos filtros del formulario
    # Podríamos factorizar la lógica; por brevedad usamos similar a reports_view pero sin render en HTML
    date_from = parse_date(request.form.get('date_from'))
    date_to = parse_date(request.form.get('date_to'))
    product_id = request.form.get('product_id') or None
    categoria = request.form.get('categoria') or None
    group_by = request.form.get('group_by') or 'product'

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
        pdf = HTML(string=html).write_pdf()
        return send_file(BytesIO(pdf), mimetype='application/pdf', as_attachment=True, download_name='reporte_ventas.pdf')
    else:
        # Fallback: devolver HTML para que el admin la imprima manualmente
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

# Comando útil: crear admin (se puede usar manage.py también)
@app.cli.command('create-admin')
def create_admin():
    username = input("Nombre de usuario admin: ")
    email = input("Email del admin: ")
    pw = input("Password: ")
    u = Usuario(nombre_usuario=username, email=email, rol='admin')
    u.set_password(pw)
    db.session.add(u)
    db.session.commit()
    print("Admin creado.")

if __name__ == '__main__':
    app.run(debug=True)

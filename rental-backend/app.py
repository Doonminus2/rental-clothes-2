from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime
from dotenv import load_dotenv

# นำเข้า Middleware
from middleware.auth import admin_only

# นำเข้า Controllers
from routes.auth import auth_bp
from controllers.dashboardController import get_stats
from controllers.authController import get_me, update_me, login, register
from controllers.productController import (
    get_products, add_product, get_product_by_id, 
    update_product, delete_product, update_product_status
)
from controllers.bookingController import (
    get_bookings, get_booking_by_id, update_booking_status,
    get_booking_stats, get_calendar_bookings 
)
from controllers.returnController import get_pending_returns, process_return

# นำเข้า Customer Controllers
from controllers.customerController import (
    get_customers, get_customer_by_id, update_customer_status, update_customer_role
)

# ✨ นำเข้า Report Controller (เพิ่มใหม่)
from controllers.reportController import get_report_stats

load_dotenv()

app = Flask(__name__, static_folder='../', static_url_path='')
CORS(app, supports_credentials=True)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMAGE_FOLDER = os.path.join(BASE_DIR, 'images')

if not os.path.exists(IMAGE_FOLDER):
    os.makedirs(IMAGE_FOLDER, exist_ok=True)

app.register_blueprint(auth_bp)

# ─── API ROUTES ───

# 🔐 Auth
@app.route('/api/login', methods=['POST'])
def api_login():
    return login()

@app.route('/api/register', methods=['POST'])
def api_register():
    return register()

@app.route('/api/me', methods=['GET', 'PUT'])
def handle_profile():
    if request.method == 'GET':
        return get_me()
    return update_me()

# 📊 Dashboard
@app.route('/api/dashboard', methods=['GET'])
@admin_only
def dashboard_api():
    return get_stats()

# 👗 Products
@app.route('/api/products', methods=['GET', 'POST'])
@admin_only
def handle_products():
    if request.method == 'GET':
        return get_products()
    return add_product()

@app.route('/api/products/<int:id>', methods=['GET', 'PUT', 'DELETE'])
@admin_only
def handle_single_product(id):
    if request.method == 'GET':
        return get_product_by_id(id)
    elif request.method == 'PUT':
        return update_product(id)
    elif request.method == 'DELETE':
        return delete_product(id)

@app.route('/api/products/<int:id>/status', methods=['PATCH'])
@admin_only
def api_update_product_status(id):
    return update_product_status(id)

# 📅 Bookings
@app.route('/api/bookings', methods=['GET'])
@admin_only
def api_get_bookings():
    return get_bookings()

@app.route('/api/bookings/stats', methods=['GET'])
@admin_only
def api_get_booking_stats():
    return get_booking_stats()

@app.route('/api/bookings/calendar', methods=['GET'])
@admin_only
def api_get_calendar_bookings():
    return get_calendar_bookings()

@app.route('/api/bookings/<int:id>', methods=['GET'])
@admin_only
def api_get_booking_detail(id):
    return get_booking_by_id(id)

@app.route('/api/bookings/<int:id>/status', methods=['PATCH'])
@admin_only
def api_update_booking_status(id):
    return update_booking_status(id)

# 🔄 Returns
@app.route('/api/returns', methods=['GET'])
@admin_only
def api_get_returns():
    return get_pending_returns()

@app.route('/api/returns/<int:id>/confirm', methods=['POST'])
@admin_only
def api_confirm_return(id):
    return process_return(id)

# 👥 Customers (จัดการลูกค้า)
@app.route('/api/customers', methods=['GET'])
@admin_only
def api_get_customers():
    return get_customers()

@app.route('/api/customers/<int:id>', methods=['GET'])
@admin_only
def api_get_customer_detail(id):
    return get_customer_by_id(id)

@app.route('/api/customers/<int:id>/blacklist', methods=['PATCH'])
@admin_only
def api_toggle_blacklist(id):
    return update_customer_status(id)

@app.route('/api/customers/<int:id>/role', methods=['PATCH'])
@admin_only
def api_update_customer_role(id):
    return update_customer_role(id)

# 📈 Reports & Analytics (✨ เพิ่มใหม่)
@app.route('/api/reports/stats', methods=['GET'])
@admin_only
def api_get_report_stats():
    return get_report_stats()

@app.route('/api/health')
def health():
    return jsonify({'success': True, 'message': 'Rental Clothes API is running 🚀'})

# ─── STATIC FILES & IMAGES ───

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(IMAGE_FOLDER, filename)

@app.route('/')
def index():
    return send_file(os.path.join(BASE_DIR, 'main.html'))

@app.route('/<path:path>')
def serve_pages(path):
    if path.startswith('api/'):
        return jsonify({'success': False, 'message': 'API not found'}), 404
    for folder in ['', 'template', 'static']:
        full_path = os.path.join(BASE_DIR, folder, path)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return send_from_directory(os.path.join(BASE_DIR, folder), path)
    return jsonify({'success': False, 'message': f'File {path} not found'}), 404

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)
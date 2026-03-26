from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime
from dotenv import load_dotenv

# นำเข้า Controllers และ Middleware
from routes.auth import auth_bp
from controllers.dashboardController import get_stats
from middleware.auth import admin_only
from controllers.authController import get_me, update_me, login, register

load_dotenv()

app = Flask(__name__, static_folder='../', static_url_path='')
# เปิด CORS ให้รองรับการส่ง Token
CORS(app, supports_credentials=True)

# ตรวจสอบโฟลเดอร์อัปโหลด
upload_dir = os.getenv('UPLOAD_PATH', 'uploads/')
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir, exist_ok=True)

# ลงทะเบียน Blueprint
app.register_blueprint(auth_bp)

# ─── API ROUTES ───

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

@app.route('/api/dashboard', methods=['GET'])
@admin_only
def dashboard_api():
    return get_stats()

@app.route('/api/health')
def health():
    return jsonify({
        'success': True, 
        'message': 'Rental Clothes API is running 🚀', 
        'time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

# ─── STATIC FILES & FRONTEND ───

@app.route('/')
def index():
    return send_file('../main.html')

# แก้ไขจุดที่ทำให้ Error 500: แยก Route HTML กับ API ให้ชัดเจน
@app.route('/login.html', methods=['GET'])
def serve_login_page():
    return send_file('../login.html')

@app.route('/register.html', methods=['GET'])
def serve_register_page():
    return send_file('../register.html')

@app.route('/dashboard.html', methods=['GET'])
def serve_dashboard_page():
    return send_file('../dashboard.html')

@app.route('/<path:path>')
def serve_static(path):
    # ป้องกันไม่ให้ Static Route ไปทับ API
    if path.startswith('api/'):
        return jsonify({'success': False, 'message': 'API not found'}), 404

    # ตรวจสอบไฟล์ในโฟลเดอร์หลัก
    file_path = os.path.join('..', path)
    if os.path.exists(file_path):
        return send_from_directory('../', path)
    
    # กรณีหาไม่เจอในโฟลเดอร์หลัก ให้หาใน template/
    template_path = os.path.join('..', 'template', path)
    if os.path.exists(template_path):
        return send_from_directory('../template/', path)

    return jsonify({'success': False, 'message': f'File {path} not found'}), 404

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)
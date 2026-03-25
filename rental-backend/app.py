from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
from routes.auth import auth_bp
from controllers.dashboardController import get_stats
from middleware.auth import admin_only

load_dotenv()

app = Flask(__name__, static_folder='../', static_url_path='')
# เปิด CORS ให้รองรับการส่ง Token และ Credentials
CORS(app, origins='*', supports_credentials=True)

# ตรวจสอบว่ามีโฟลเดอร์สำหรับอัปโหลดไฟล์หรือไม่
upload_dir = os.getenv('UPLOAD_PATH', 'uploads/')
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir, exist_ok=True)

# ลงทะเบียน Blueprint สำหรับระบบ Auth (Login/Register)
app.register_blueprint(auth_bp)

# ─── API ROUTES ───

# Route สำหรับหน้าจัดการข้อมูลส่วนตัว (ดึงข้อมูล และ อัปเดตข้อมูล)
@app.route('/api/me', methods=['GET', 'PUT', 'POST'])
def handle_profile():
    from controllers.authController import get_me, update_me
    if request.method == 'GET':
        return get_me()
    return update_me()

# Route สำหรับ Dashboard (เฉพาะ Admin)
@app.route('/api/dashboard', methods=['GET'])
@admin_only
def dashboard():
    return get_stats()

# Route สำหรับเช็คสถานะระบบ
@app.route('/api/health')
def health():
    from datetime import datetime
    return jsonify({
        'success': True, 
        'message': 'Rental Clothes API is running 🚀', 
        'time': datetime.now()
    })

# ─── STATIC FILES & FRONTEND ───

# หน้าหลัก (Home Page)
@app.route('/')
def index():
    return send_file('../main.html')

# รองรับการส่ง Form จากหน้า Register/Login โดยตรง
@app.route('/register.html', methods=['POST'])
def register_html_post():
    from controllers.authController import register
    return register()

@app.route('/login.html', methods=['POST'])
def login_html_post():
    from controllers.authController import login
    return login()

# จัดการไฟล์ Static (CSS, JS, Images) และป้องกัน Path API
@app.route('/<path:path>', methods=['GET'])
def serve_static(path):
    if path.startswith('api/'):
        return jsonify({'success': False, 'message': 'API route not found'}), 404

    # รองรับโครงสร้างโฟลเดอร์แบบเก่า
    if path.startswith('template/'):
        fallback = path[len('template/'):]
        if os.path.exists(os.path.join('..', fallback)):
            return send_from_directory('../', fallback)

    # จัดการชื่อไฟล์ JavaScript ที่อาจจะพิมพ์เล็ก-ใหญ่ไม่ตรงกัน
    if path == 'carousel.js' and os.path.exists(os.path.join('..', 'Carousel.js')):
        return send_from_directory('../', 'Carousel.js')

    if os.path.exists(os.path.join('..', path)):
        return send_from_directory('../', path)

    return jsonify({'success': False, 'message': 'File not found'}), 404

# Route สำหรับดึงรูปภาพที่อัปโหลด
@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    return send_from_directory(upload_dir, filename)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    # รันบน 0.0.0.0 เพื่อให้เข้าถึงได้จากทุก Network ในเครื่อง
    app.run(host='0.0.0.0', port=port, debug=True)
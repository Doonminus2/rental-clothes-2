import bcrypt
import jwt
import os
import sqlite3
from datetime import datetime, timedelta
from flask import request, jsonify
from config.db import get_connection

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')

def generate_token(payload):
    # กำหนดให้ Token หมดอายุใน 7 วัน
    expires = datetime.utcnow() + timedelta(days=7)
    payload['exp'] = expires
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def login():
    # รองรับทั้ง JSON และ Form Data
    data = request.get_json(silent=True) or request.form
    username = data.get('username') or data.get('email')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': 'กรุณากรอก Username และ Password'}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM users WHERE username = ? OR email = ?', (username, username))
        user_row = cursor.fetchone()
        
        if not user_row:
            return jsonify({'success': False, 'message': 'ไม่พบบัญชีผู้ใช้นี้'}), 401

        user_dict = dict(user_row)

        if user_dict.get('is_blacklisted'):
            return jsonify({'success': False, 'message': 'บัญชีนี้ถูกระงับการใช้งาน'}), 403

        # ตรวจสอบรหัสผ่าน
        if not bcrypt.checkpw(password.encode(), user_dict['password'].encode()):
            return jsonify({'success': False, 'message': 'รหัสผ่านไม่ถูกต้อง'}), 401

        # สร้าง Token
        payload = {
            'id': user_dict['id'],
            'username': user_dict['username'],
            'role': user_dict.get('role', 'customer')
        }
        token = generate_token(payload)

        # เตรียมข้อมูล User ส่งกลับ (รวม phone และ address ไปด้วย)
        safe_user = {k: v for k, v in user_dict.items() if k != 'password'}
        
        return jsonify({
            'success': True, 
            'message': 'เข้าสู่ระบบสำเร็จ',
            'token': token, 
            'user': safe_user
        })

    except Exception as err:
        print("Login Error Details:", err)
        return jsonify({'success': False, 'message': 'เกิดข้อผิดพลาดในระบบ'}), 500
    finally:
        conn.close()

def register():
    data = request.get_json(silent=True) or request.form
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    phone = data.get('phone')
    address = data.get('address')

    if not all([username, email, password, full_name]):
        return jsonify({'success': False, 'message': 'กรุณากรอกข้อมูลให้ครบ'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Username หรือ Email นี้ถูกใช้แล้ว'}), 409

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
        cursor.execute(
            'INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (username, email, hashed.decode(), full_name, phone or None, address or None, 'customer')
        )
        conn.commit()
        
        return jsonify({'success': True, 'message': 'สมัครสมาชิกสำเร็จ'}), 201
    except Exception as err:
        print("Register Error:", err)
        return jsonify({'success': False, 'message': 'เกิดข้อผิดพลาดในระบบ'}), 500
    finally:
        conn.close()

def get_me():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'กรุณาล็อกอินใหม่'}), 401
    
    token = auth_header.split(" ")[1]
    conn = None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload['id']

        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        # ✨ มั่นใจว่าดึง phone และ address มาด้วย
        cursor.execute('SELECT id, username, email, full_name, phone, address, role FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'message': 'ไม่พบผู้ใช้'}), 404
            
        # ✅ แก้ไข: เปลี่ยนคีย์จาก 'user' เป็น 'data' เพื่อให้ตรงกับ JavaScript ที่หน้า Checkout เรียกใช้
        return jsonify({'success': True, 'data': dict(user)}) 
        
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'message': 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'}), 401
    except Exception as err:
        print("Get Me Error:", err)
        return jsonify({'success': False, 'message': 'Token ไม่ถูกต้อง'}), 401
    finally:
        if conn: conn.close()

def update_me():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    token = auth_header.split(" ")[1]
    conn = None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload['id']
        
        data = request.get_json()
        email = data.get('email')
        full_name = data.get('full_name')
        phone = data.get('phone')
        address = data.get('address')
        password = data.get('password')

        conn = get_connection()
        cursor = conn.cursor()
        
        if password:
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
            cursor.execute(
                'UPDATE users SET email=?, full_name=?, phone=?, address=?, password=? WHERE id=?',
                (email, full_name, phone, address, hashed.decode(), user_id)
            )
        else:
            cursor.execute(
                'UPDATE users SET email=?, full_name=?, phone=?, address=? WHERE id=?',
                (email, full_name, phone, address, user_id)
            )
        conn.commit()
        return jsonify({'success': True, 'message': 'อัปเดตข้อมูลสำเร็จ'})
    except Exception as err:
        print("Update Error:", err)
        return jsonify({'success': False, 'message': 'บันทึกข้อมูลไม่สำเร็จ'}), 500
    finally:
        if conn: conn.close()
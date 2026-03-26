import sqlite3
import os
from flask import request, jsonify
from config.db import get_connection
from werkzeug.utils import secure_filename
from datetime import datetime

# ✅ Path สำหรับเก็บสลิป
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOAD_SLIP_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads', 'slips')

# ─── 0. สร้างการจองใหม่ ───
def create_booking():
    user_id = request.form.get('user_id')
    product_id = request.form.get('product_id')
    size = request.form.get('size')
    duration = request.form.get('duration')
    total_price = request.form.get('total_price')
    rental_start = request.form.get('rental_start')
    rental_end = request.form.get('rental_end')
    
    if not user_id or not product_id:
        return jsonify({'success': False, 'message': 'ข้อมูลผู้ใช้หรือสินค้าไม่ครบถ้วน'}), 400

    if 'slip' not in request.files:
        return jsonify({'success': False, 'message': 'ไม่พบไฟล์สลิป'}), 400
    
    file = request.files['slip']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'กรุณาเลือกไฟล์สลิป'}), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = secure_filename(f"slip_u{user_id}_{timestamp}.png")
        
        if not os.path.exists(UPLOAD_SLIP_FOLDER):
            os.makedirs(UPLOAD_SLIP_FOLDER, exist_ok=True)
            
        file.save(os.path.join(UPLOAD_SLIP_FOLDER, filename))

        # ดึงค่า deposit จาก products ก่อน INSERT
        cursor.execute("SELECT deposit FROM products WHERE id = ?", (product_id,))
        product = cursor.fetchone()
        deposit_amount = product[0] if product else 0

        cursor.execute("""
            INSERT INTO bookings 
            (user_id, product_id, size, duration, total_price, slip_image, 
             status, rental_start, rental_end, deposit_amount, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (user_id, product_id, size, duration, total_price, filename, 
              'pending', rental_start, rental_end, deposit_amount))
        
        cursor.execute("UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0", (product_id,))

        conn.commit()
        return jsonify({'success': True, 'message': 'บันทึกการจองเรียบร้อยแล้ว'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 1. ดึงรายการการจอง (กรองตาม Username สำหรับลูกค้า หรือค้นหาสำหรับ Admin) ───
def get_bookings():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    
    # ✨ 🚩 รับค่า username จากหน้าบ้าน (ดึงจาก localStorage.getItem('userName'))
    target_username = request.args.get('username')
    
    query = """
    SELECT 
        b.*,
        p.name as product_name,
        p.image_url,
        CASE WHEN b.deposit_amount > 0 
             THEN b.deposit_amount 
             ELSE p.deposit 
        END AS deposit_amount,
        u.username as full_name
    FROM bookings b
    JOIN products p ON b.product_id = p.id
    JOIN users u ON b.user_id = u.id
    WHERE (u.username LIKE ? OR CAST(b.id AS TEXT) LIKE ?)
    """
    params = [f'%{search}%', f'%{search}%']
    
    # 🚩 ✨ เงื่อนไขสำคัญ: ถ้าส่ง username มา (จากหน้า My Orders) ให้กรองเฉพาะของคนนั้นเป๊ะๆ
    if target_username and target_username != 'undefined' and target_username != '':
        query += " AND u.username = ?"
        params.append(target_username)
    
    if status and status != '' and status != 'ทุกสถานะ':
        query += " AND b.status = ?"
        params.append(status)
        
    query += " ORDER BY b.id DESC"
    
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        data = []
        for row in rows:
            item = dict(row)
            # สร้าง URL สลิปให้หน้าบ้าน
            if item.get('slip_image'):
                item['slip_url'] = f"/static/uploads/slips/{item['slip_image']}"
            data.append(item)
            
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 2. ดึงรายละเอียดการจองรายชิ้น ───
def get_booking_by_id(id):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT b.*, p.name as product_name, p.image_url, p.brand, p.category,
                   CASE WHEN b.deposit_amount > 0 
                        THEN b.deposit_amount 
                        ELSE p.deposit 
                   END AS deposit_amount,
                   u.username as full_name, u.phone, u.address
            FROM bookings b
            JOIN products p ON b.product_id = p.id
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        """, (id,))
        row = cursor.fetchone()
        if row:
            data = dict(row)
            if data.get('slip_image'):
                data['slip_url'] = f"/static/uploads/slips/{data['slip_image']}"
            return jsonify({'success': True, 'data': data})
        return jsonify({'success': False, 'message': 'ไม่พบข้อมูล'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 3. อัปเดตสถานะ ───
def update_booking_status(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        data = request.get_json()
        new_status = data.get('status')
        tracking = data.get('tracking_number', '')
        carrier = data.get('shipping_carrier', '')
        
        cursor.execute("""
            UPDATE bookings 
            SET status = ?, tracking_number = ?, shipping_carrier = ?
            WHERE id = ?
        """, (new_status, tracking, carrier, id))
        
        if new_status in ['rejected', 'cancelled']:
            cursor.execute("""
                UPDATE products 
                SET stock = stock + 1 
                WHERE id = (SELECT product_id FROM bookings WHERE id = ?)
            """, (id,))
            
        conn.commit()
        return jsonify({'success': True, 'message': 'อัปเดตสถานะเรียบร้อย'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 4. สถิติ ───
def get_booking_stats():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE strftime('%m', created_at) = strftime('%m', 'now')")
        total_month = cursor.fetchone()[0] or 0
        cursor.execute("SELECT status, COUNT(*) FROM bookings GROUP BY status")
        rows = cursor.fetchall()
        stats = {'total': total_month, 'pending': 0, 'packing': 0, 'shipped': 0, 'received': 0, 'rejected': 0}
        for status, count in rows:
            if status in stats: stats[status] = count
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 5. ปฏิทิน ───
def get_calendar_bookings():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    month = request.args.get('month')
    year = request.args.get('year')
    if not month or not year: return jsonify({'success': False, 'message': 'ขาดข้อมูล'}), 400
    try:
        cursor.execute("""
            SELECT b.id, u.username as full_name, b.rental_start, b.rental_end, p.name as product_name 
            FROM bookings b 
            JOIN products p ON b.product_id = p.id
            JOIN users u ON b.user_id = u.id
            WHERE strftime('%m', b.rental_start) = ? AND strftime('%Y', b.rental_start) = ?
        """, (month.zfill(2), year))
        rows = cursor.fetchall()
        return jsonify({'success': True, 'data': [dict(row) for row in rows]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()
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

        # ✅ บันทึกการจอง
        cursor.execute("""
            INSERT INTO bookings 
            (user_id, product_id, size, duration, total_price, slip_image, status, rental_start, rental_end, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (user_id, product_id, size, duration, total_price, filename, 'pending', rental_start, rental_end))
        
        cursor.execute("UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0", (product_id,))

        conn.commit()
        return jsonify({'success': True, 'message': 'บันทึกการจองเรียบร้อยแล้ว'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 1. ดึงรายการการจองทั้งหมด (ใช้ในหน้า Booking และ Return) ───
def get_bookings():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    
    # ✨ JOIN products เพื่อเอาค่า deposit จากตาราง products มาแสดงผล
    query = """
        SELECT 
            b.*, 
            p.name as product_name, 
            p.image_url, 
            p.deposit AS deposit_amount, 
            u.username as full_name
        FROM bookings b
        JOIN products p ON b.product_id = p.id
        JOIN users u ON b.user_id = u.id
        WHERE (u.username LIKE ? OR b.id LIKE ?)
    """
    params = [f'%{search}%', f'%{search}%']
    
    if status and status != 'ทุกสถานะ':
        query += " AND b.status = ?"
        params.append(status)
        
    query += " ORDER BY b.id DESC"
    
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]
        
        # DEBUG: ตรวจสอบข้อมูลในจอดำ (Terminal)
        if data:
            print(f"--- DEBUG: ดึงข้อมูลสำเร็จ ---")
            print(f"Order: {data[0]['id']} | Deposit from Product: {data[0]['deposit_amount']}")
            
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 2. ดึงรายละเอียดการจองรายชิ้น (สำหรับ Modal) ───
def get_booking_by_id(id):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # ✨ ดึงค่า deposit จากตาราง products เช่นกัน
        cursor.execute("""
            SELECT b.*, p.name as product_name, p.image_url, p.brand, p.category, 
                   p.deposit AS deposit_amount, 
                   u.username as full_name, u.phone
            FROM bookings b
            JOIN products p ON b.product_id = p.id
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        """, (id,))
        row = cursor.fetchone()
        if row:
            return jsonify({'success': True, 'data': dict(row)})
        return jsonify({'success': False, 'message': 'ไม่พบข้อมูล'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 3. อัปเดตสถานะและเลข Tracking ───
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
        
        if new_status in ['rejected', 'cancelled', 'received']:
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

# ─── 4. ดึงสถิติตัวเลข ───
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
            if status in stats:
                stats[status] = count
                
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 5. ดึงข้อมูลปฏิทิน ───
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
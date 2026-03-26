import sqlite3
from flask import request, jsonify
from config.db import get_connection

# ─── 1. ดึงรายการการจองทั้งหมด (JOIN 3 ตารางเพื่อเอาชื่อลูกค้า) ───
def get_bookings():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    
    # แก้ไข: JOIN ตาราง users เพื่อดึง username มาใช้เป็นชื่อลูกค้า
    query = """
        SELECT b.*, p.name as product_name, u.username as full_name
        FROM bookings b
        JOIN products p ON b.product_id = p.id
        JOIN users u ON b.user_id = u.id
        WHERE (u.username LIKE ? OR b.id LIKE ?)
    """
    params = [f'%{search}%', f'%{search}%']
    
    if status:
        query += " AND b.status = ?"
        params.append(status)
        
    query += " ORDER BY b.id DESC"
    
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return jsonify({
            'success': True,
            'data': [dict(row) for row in rows],
            'total': len(rows)
        })
    except Exception as e:
        print(f"❌ Error get_bookings: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 2. ดึงรายละเอียดการจอง "รายชิ้น" (สำหรับ Modal) ───
def get_booking_by_id(id):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # ดึงข้อมูลสินค้า + ชื่อลูกค้าจากตาราง users
        cursor.execute("""
            SELECT b.*, p.name as product_name, p.image_url, p.brand, p.category, 
                   u.username as full_name, u.phone
            FROM bookings b
            JOIN products p ON b.product_id = p.id
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        """, (id,))
        row = cursor.fetchone()
        if row:
            return jsonify({'success': True, 'data': dict(row)})
        return jsonify({'success': False, 'message': 'ไม่พบข้อมูลออเดอร์'}), 404
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
        tracking = data.get('tracking_number')
        carrier = data.get('shipping_carrier')
        
        cursor.execute("""
            UPDATE bookings 
            SET status = ?, tracking_number = ?, shipping_carrier = ?
            WHERE id = ?
        """, (new_status, tracking, carrier, id))
        
        # ถ้าคืนชุดแล้ว ให้บวกสต็อกคืน
        if new_status == 'received':
            cursor.execute("""
                UPDATE products 
                SET stock = stock + 1 
                WHERE id = (SELECT product_id FROM bookings WHERE id = ?)
            """, (id,))
            
        conn.commit()
        return jsonify({'success': True, 'message': 'อัปเดตออเดอร์เรียบร้อย'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 4. ดึงสถิติตัวเลข (Stat Cards) ───
def get_booking_stats():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # นับออเดอร์ในเดือนปัจจุบัน
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE strftime('%m', rental_start) = strftime('%m', 'now')")
        total_month = cursor.fetchone()[0] or 0

        # นับแยกตามสถานะ
        cursor.execute("SELECT status, COUNT(*) FROM bookings GROUP BY status")
        rows = cursor.fetchall()
        
        stats = {'total': total_month, 'waiting': 0, 'shipped': 0, 'received': 0}
        for status, count in rows:
            if status in stats:
                stats[status] = count
                
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 5. ดึงข้อมูลการจองลงปฏิทิน ───
def get_calendar_bookings():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    month = request.args.get('month')
    year = request.args.get('year')
    
    if not month or not year:
        return jsonify({'success': False, 'message': 'Missing month or year'}), 400
        
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
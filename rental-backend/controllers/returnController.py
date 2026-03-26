import sqlite3
from flask import request, jsonify
from config.db import get_connection

# ─── 1. ดึงรายการที่รอรับคืน (Status: shipped หรือ received) ───
def get_pending_returns():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
    # เราจะดึงเฉพาะรายการที่กางเกง/ชุดถูกส่งออกไปแล้ว แต่ยังไม่มีการบันทึกว่าคืนสำเร็จ (เพิ่ม deposit_amount)
        cursor.execute("""
            SELECT b.*, p.name as product_name, p.image_url, p.deposit AS deposit_amount, u.username as full_name, u.phone
            FROM bookings b
            JOIN products p ON b.product_id = p.id
            JOIN users u ON b.user_id = u.id
            WHERE b.status IN ('shipped', 'received')
            ORDER BY b.rental_end ASC
        """)
        rows = cursor.fetchall()
        return jsonify({
            'success': True, 
            'data': [dict(row) for row in rows],
            'total': len(rows)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 2. ยืนยันการรับคืนชุด (Update Status + คืน Stock) ───
def process_return(id):
    conn = get_connection()
    cursor = conn.cursor()
    data = request.get_json()
    
    # รับค่าปรับ (ถ้ามี) และหมายเหตุจากหน้าบ้าน
    fine_amount = data.get('fine_amount', 0)
    note = data.get('note', '')

    try:
        # 1. อัปเดตสถานะการจองเป็น 'received' (หรือจะตั้ง status ใหม่ว่า 'returned' ก็ได้)
        # ในที่นี้ผมใช้ 'received' เพื่อให้เข้ากับระบบเดิมของโฟล์คครับ
        cursor.execute("""
            UPDATE bookings 
            SET status = 'received', 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (id,))
        
        # 2. สำคัญมาก: บวกสต็อกสินค้ากลับคืนเข้าคลัง 1 ชิ้น
        cursor.execute("""
            UPDATE products 
            SET stock = stock + 1 
            WHERE id = (SELECT product_id FROM bookings WHERE id = ?)
        """, (id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'รับคืนสินค้าและเพิ่มสต็อกเรียบร้อยแล้ว'})
    except Exception as e:
        conn.rollback() # ถ้าพังให้ยกเลิกการแก้ไขทั้งหมด
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# ─── 3. ดึงสถิติหน้า Return (Stat Cards) ───
def get_return_stats():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # นับรายการที่เกินกำหนดคืน (Late)
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE status IN ('shipped', 'received') AND rental_end < date('now')")
        late_count = cursor.fetchone()[0]
        
        # นับรายการที่รอตรวจ (Pending)
        cursor.execute("SELECT COUNT(*) FROM bookings WHERE status IN ('shipped', 'received')")
        pending_count = cursor.fetchone()[0]
        
        return jsonify({
            'success': True, 
            'data': {
                'pending': pending_count,
                'late': late_count
            }
        })
    finally:
        conn.close()
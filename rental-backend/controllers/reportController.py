import sqlite3
from flask import jsonify
from config.db import get_connection

def get_report_stats():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        # 1. รายได้รวม แยกตามเดือนในปีปัจจุบัน (ปี 2026 ตามที่โฟล์คตั้งค่าไว้)
        cursor.execute("""
            SELECT strftime('%m', rental_start) as month, 
                   SUM(total_price) as gross
            FROM bookings 
            WHERE payment_status = 'paid' AND strftime('%Y', rental_start) = strftime('%Y', 'now')
            GROUP BY month
        """)
        revenue_rows = cursor.fetchall()
        
        # เตรียมข้อมูล 12 เดือน (ใส่ 0 กันไว้เดือนที่ยังไม่มีคนเช่า)
        monthly_data = [0] * 12
        for row in revenue_rows:
            idx = int(row['month']) - 1
            monthly_data[idx] = row['gross']

        # 2. สินค้าขายดี 6 อันดับแรก
        cursor.execute("""
            SELECT p.name, p.category, COUNT(b.id) as rent_count, SUM(b.total_price) as total_revenue
            FROM bookings b
            JOIN products p ON b.product_id = p.id
            GROUP BY p.id
            ORDER BY rent_count DESC LIMIT 6
        """)
        top_products = [dict(p) for p in cursor.fetchall()]

        # 3. สรุปตัวเลข Stat Cards (เดือนปัจจุบัน)
        cursor.execute("SELECT SUM(total_price) FROM bookings WHERE strftime('%m', rental_start) = strftime('%m', 'now') AND payment_status = 'paid'")
        current_month_gross = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(id) FROM bookings WHERE strftime('%m', rental_start) = strftime('%m', 'now')")
        current_month_rents = cursor.fetchone()[0] or 0

        return jsonify({
            'success': True,
            'monthly_revenue': monthly_data,
            'top_products': top_products,
            'stats': {
                'gross': current_month_gross,
                'rents': current_month_rents
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()
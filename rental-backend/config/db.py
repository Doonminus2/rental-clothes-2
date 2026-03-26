import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

# ดึงค่าจาก .env ถ้าไม่มีให้ใช้ 'rental_clothes.db' เป็นค่าเริ่มต้น
# 💡 เช็คให้ชัวร์ว่าไฟล์ .db ของโฟล์คอยู่ที่เดียวกับไฟล์ app.py หรือเปล่า
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
default_db = os.path.join(BASE_DIR, 'rental_clothes.db')
db_path = os.getenv('DB_PATH', default_db)

def get_connection():
    try:
        # เชื่อมต่อ Database และตั้งค่า row_factory เพื่อให้ดึงข้อมูลเป็น dict ได้
        connection = sqlite3.connect(db_path, check_same_thread=False)
        connection.row_factory = sqlite3.Row  
        return connection
    except sqlite3.Error as err:
        print(f"❌ SQLite connection failed: {err}")
        return None
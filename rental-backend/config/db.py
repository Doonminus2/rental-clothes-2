import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

# ดึงค่าจาก .env ถ้าไม่มีให้ใช้ 'rental_clothes.db' เป็นค่าเริ่มต้น
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
default_db = os.path.join(BASE_DIR, 'rental_clothes.db')
db_path = os.getenv('DB_PATH', default_db)

# Vercel environment detection
IS_VERCEL = os.getenv('VERCEL') == '1'

def get_connection():
    try:
        # สำหรับ Vercel: ถ้า DB_PATH ไม่ได้ถูก set ให้ใช้ /tmp (ephemeral storage)
        if IS_VERCEL and not os.getenv('DB_PATH'):
            db_location = '/tmp/rental_clothes.db'
            # Copy database file from code ถ้ายังไม่มี
            if not os.path.exists(db_location):
                import shutil
                if os.path.exists(default_db):
                    shutil.copy(default_db, db_location)
            db_path_used = db_location
        else:
            db_path_used = db_path
        
        # เชื่อมต่อ Database และตั้งค่า row_factory เพื่อให้ดึงข้อมูลเป็น dict ได้
        connection = sqlite3.connect(db_path_used, check_same_thread=False)
        connection.row_factory = sqlite3.Row  
        return connection
    except sqlite3.Error as err:
        print(f"❌ SQLite connection failed: {err}")
        return None
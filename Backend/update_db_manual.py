import sqlite3
import os

db_path = 'c:\\Users\\John Marcel Aleman\\Desktop\\ED-IQ\\Backend\\database.db'

if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if student_id column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'student_id' not in columns:
            print("Adding student_id column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN student_id VARCHAR(20)")
            conn.commit()
            print("Column added successfully.")
        else:
            print("student_id column already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Error updating database: {e}")
else:
    print(f"Database file not found at {db_path}")

import os
from sqlalchemy import create_engine, text

# Database URL from legacy migration script
DATABASE_URL = "postgresql://ediqapp_user:T0CKCaxAyXxeV9nTxr69YIGTOuA0as3c@dpg-d2a5orqdbo4c73b0gtmg-a.singapore-postgres.render.com/ediqapp"

def fix_users_table():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            with connection.begin():
                print("Checking for student_id column in users table...")
                # Check if column exists
                result = connection.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'student_id'
                """))
                
                if result.fetchone():
                    print("✓ student_id column already exists.")
                else:
                    print("Adding student_id column...")
                    connection.execute(text("ALTER TABLE users ADD COLUMN student_id VARCHAR(20) NULL"))
                    print("✅ student_id column added successfully!")
                
                return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    fix_users_table()

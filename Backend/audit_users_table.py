from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://ediqapp_user:T0CKCaxAyXxeV9nTxr69YIGTOuA0as3c@dpg-d2a5orqdbo4c73b0gtmg-a.singapore-postgres.render.com/ediqapp"

def audit_users_table():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            print("Auditing users table columns...")
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users'
            """))
            
            for row in result:
                print(f"Column: {row[0]} | Type: {row[1]} | Nullable: {row[2]} | Default: {row[3]}")
                
            return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    audit_users_table()

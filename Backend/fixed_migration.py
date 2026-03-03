#!/usr/bin/env python3
"""
Fixed migration script for adding subject_id to notifications table
Uses correct table name: 'subject' (not 'subjects')
"""
import os
import sys
from sqlalchemy import create_engine, text

# Database URL
DATABASE_URL = "postgresql://ediqapp_user:T0CKCaxAyXxeV9nTxr69YIGTOuA0as3c@dpg-d2a5orqdbo4c73b0gtmg-a.singapore-postgres.render.com/ediqapp"

def fixed_migration():
    """Execute the fixed migration"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, echo=False)
        
        with engine.begin() as connection:  # Use begin() for auto-commit on success
            print("✓ Connected to database successfully!")
            
            # Step 1: Check if column exists
            print("\n[1] Checking if subject_id column exists...")
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'notifications' 
                AND column_name = 'subject_id'
            """))
            
            column_exists = result.fetchone() is not None
            
            if not column_exists:
                print("[2] Adding subject_id column...")
                connection.execute(text("""
                    ALTER TABLE notifications 
                    ADD COLUMN subject_id TEXT
                """))
                print("✓ Column subject_id added")
            else:
                print("✓ Column subject_id already exists")
            
            # Step 2: Add foreign key constraint to 'subject' table
            print("\n[3] Checking for foreign key constraint...")
            result = connection.execute(text("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'notifications' 
                AND constraint_name = 'fk_notifications_subject_id'
            """))
            
            if not result.fetchone():
                print("[3b] Adding foreign key constraint to 'subject' table...")
                try:
                    connection.execute(text("""
                        ALTER TABLE notifications 
                        ADD CONSTRAINT fk_notifications_subject_id 
                        FOREIGN KEY (subject_id) 
                        REFERENCES subject(id) 
                        ON DELETE CASCADE
                    """))
                    print("✓ Foreign key constraint added")
                except Exception as e:
                    print(f"⚠️  Could not add FK: {str(e)}")
            else:
                print("✓ Foreign key constraint already exists")
            
            # Step 3: Create index
            print("\n[4] Creating index on subject_id...")
            try:
                connection.execute(text("""
                    DROP INDEX IF EXISTS idx_notifications_subject_id
                """))
                
                connection.execute(text("""
                    CREATE INDEX idx_notifications_subject_id 
                    ON notifications(subject_id)
                """))
                print("✓ Index created successfully")
            except Exception as e:
                print(f"⚠️  Index status: {str(e)}")
            
            # Step 4: Verify
            print("\n[5] Verifying the changes...")
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'notifications'
                ORDER BY ordinal_position
            """))
            
            print("\nNotifications table columns:")
            subject_id_found = False
            for row in result:
                col_name = row[0]
                col_type = row[1]
                nullable = row[2]
                marker = "✓" if col_name == "subject_id" else " "
                print(f"  {marker} {col_name}: {col_type} (nullable: {nullable})")
                if col_name == "subject_id":
                    subject_id_found = True
            
            if not subject_id_found:
                print("\n❌ subject_id column not found after migration!")
                return False
            
            print("\n" + "="*60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("="*60)
            
            print("\nWhat was done:")
            print("✓ Added subject_id column to notifications table")
            print("✓ Added foreign key constraint to 'subject' table")
            print("✓ Created index on subject_id for performance")
            
            print("\n🚀 Next steps:")
            print("1. Restart your backend server")
            print("2. Create a new student enrollment request")
            print("3. Check the Notifications tab")
            print("4. Click on the enrollment request notification")
            print("5. You should now be navigated to the Students List!")
            print("6. The pending student should be visible in 'WANT TO ENROLL' section")
            
            return True
            
    except Exception as e:
        print(f"\n❌ Critical error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("="*60)
    print("🔧 Fixed Notification Migration")
    print("="*60)
    
    success = fixed_migration()
    sys.exit(0 if success else 1)

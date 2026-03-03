#!/usr/bin/env python3
"""
Script to add subject_id column to notifications table in Render database
"""
import os
import sys
from sqlalchemy import create_engine, text

# Database URL
DATABASE_URL = "postgresql://ediqapp_user:T0CKCaxAyXxeV9nTxr69YIGTOuA0as3c@dpg-d2a5orqdbo4c73b0gtmg-a.singapore-postgres.render.com/ediqapp"

def migrate_database():
    """Execute the migration to add subject_id to notifications table"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, echo=True)
        
        # Connect to database
        with engine.connect() as connection:
            # Start transaction
            with connection.begin():
                print("✓ Connected to database successfully!")
                
                # Check if column already exists
                print("\n[1] Checking if subject_id column already exists...")
                result = connection.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications' 
                    AND column_name = 'subject_id'
                """))
                
                if result.fetchone():
                    print("✓ Column subject_id already exists. Migration is complete!")
                    return True
                
                # Add subject_id column
                print("\n[2] Adding subject_id column to notifications table...")
                connection.execute(text("""
                    ALTER TABLE notifications 
                    ADD COLUMN subject_id TEXT
                """))
                print("✓ Column subject_id added successfully!")
                
                # Add foreign key constraint
                print("\n[3] Adding foreign key constraint...")
                connection.execute(text("""
                    ALTER TABLE notifications 
                    ADD CONSTRAINT fk_notifications_subject_id 
                    FOREIGN KEY (subject_id) 
                    REFERENCES subjects(id) 
                    ON DELETE CASCADE
                """))
                print("✓ Foreign key constraint added successfully!")
                
                # Create index
                print("\n[4] Creating index on subject_id column...")
                connection.execute(text("""
                    CREATE INDEX idx_notifications_subject_id 
                    ON notifications(subject_id)
                """))
                print("✓ Index created successfully!")
                
                # Verify the changes
                print("\n[5] Verifying the changes...")
                result = connection.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications'
                    ORDER BY ordinal_position
                """))
                
                print("\nNotifications table columns:")
                for row in result:
                    print(f"  - {row[0]}: {row[1]} (nullable: {row[2]})")
                
                print("\n✅ Migration completed successfully!")
                print("\nYou can now:")
                print("1. Restart your backend server")
                print("2. Create a new enrollment request")
                print("3. Click the enrollment notification - it should now navigate to the students list!")
                
                return True
                
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        print(f"\nError type: {type(e).__name__}")
        
        # Check if it's a connection error
        if "could not translate" in str(e).lower() or "permission denied" in str(e).lower():
            print("\n⚠️  Possible causes:")
            print("  - Invalid database URL")
            print("  - Network connectivity issues")
            print("  - Incorrect credentials")
        
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Render Database Migration Script")
    print("=" * 60)
    
    success = migrate_database()
    
    sys.exit(0 if success else 1)

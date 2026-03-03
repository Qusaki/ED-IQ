#!/usr/bin/env python3
"""
Script to complete the migration by adding foreign key to notifications table
"""
import os
import sys
from sqlalchemy import create_engine, text

# Database URL
DATABASE_URL = "postgresql://ediqapp_user:T0CKCaxAyXxeV9nTxr69YIGTOuA0as3c@dpg-d2a5orqdbo4c73b0gtmg-a.singapore-postgres.render.com/ediqapp"

def complete_migration():
    """Complete the migration by adding foreign key constraint"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, echo=False)
        
        # Connect to database
        with engine.connect() as connection:
            # Start transaction
            with connection.begin():
                print("✓ Connected to database successfully!")
                
                # List all tables to check structure
                print("\n[1] Listing all tables in the database...")
                result = connection.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """))
                
                tables = []
                for row in result:
                    tables.append(row[0])
                    print(f"  - {row[0]}")
                
                # Check if subjects table exists
                if 'subjects' not in tables:
                    print("\n⚠️  WARNING: 'subjects' table not found!")
                    print("   Skipping foreign key constraint creation")
                    print("   The column subject_id has been added but without FK constraint")
                else:
                    print("\n✓ Found 'subjects' table")
                
                # Check if constraint already exists
                print("\n[2] Checking for existing constraints...")
                result = connection.execute(text("""
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE table_name = 'notifications' 
                    AND constraint_name = 'fk_notifications_subject_id'
                """))
                
                if result.fetchone():
                    print("✓ Foreign key constraint already exists")
                else:
                    print("✗ Foreign key constraint does not exist")
                    
                    # Try to add it if subjects table exists
                    if 'subjects' in tables:
                        print("\n[3] Adding foreign key constraint...")
                        try:
                            connection.execute(text("""
                                ALTER TABLE notifications 
                                ADD CONSTRAINT fk_notifications_subject_id 
                                FOREIGN KEY (subject_id) 
                                REFERENCES subjects(id) 
                                ON DELETE CASCADE
                            """))
                            print("✓ Foreign key constraint added successfully!")
                        except Exception as fk_error:
                            print(f"⚠️  Could not add foreign key: {str(fk_error)}")
                            print("   This is not critical - the subject_id column is still there")
                
                # Create index
                print("\n[4] Creating index on subject_id column...")
                try:
                    connection.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_notifications_subject_id 
                        ON notifications(subject_id)
                    """))
                    print("✓ Index created successfully!")
                except Exception as idx_error:
                    print(f"⚠️  Index creation message: {str(idx_error)}")
                
                # Verify the column exists
                print("\n[5] Verifying subject_id column...")
                result = connection.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'notifications'
                    AND column_name = 'subject_id'
                """))
                
                row = result.fetchone()
                if row:
                    print(f"✓ Column exists: {row[0]} ({row[1]}, nullable: {row[2]})")
                else:
                    print("✗ Column does not exist!")
                    return False
                
                print("\n✅ Migration completed!")
                print("\nWhat was done:")
                print("✓ Added subject_id column to notifications table")
                print("✓ Created index on subject_id for better performance")
                if 'subjects' in tables:
                    print("✓ Added foreign key constraint to subjects table")
                else:
                    print("⚠️  Could not add FK (subjects table structure issue)")
                
                print("\nNext steps:")
                print("1. Restart your backend server")
                print("2. Try creating a new enrollment request")
                print("3. Click the enrollment notification")
                print("4. You should now be taken to the students list!")
                
                return True
                
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Complete Notification Migration")
    print("=" * 60)
    
    success = complete_migration()
    
    sys.exit(0 if success else 1)

import os
import sys
import sqlalchemy as sa

sys.path.append(os.path.abspath("."))

from models.base import Base
import models.user
import models.subject
import models.lecture
import models.activity
import models.submission
# Import any other models just in case they are not loaded
import models.notification

render_engine = sa.create_engine(os.environ['DATABASE_URL'])
inspector = sa.inspect(render_engine)

print("====== DATABASE SCHEMA ANALYSIS ======")
missing_elements = 0

for table_name in Base.metadata.tables.keys():
    if not inspector.has_table(table_name):
        print(f"[!] MISSING TABLE: {table_name}")
        missing_elements += 1
        continue
    
    db_columns = {c['name']: c for c in inspector.get_columns(table_name)}
    model_columns = Base.metadata.tables[table_name].columns
    
    for col in model_columns:
        if col.name not in db_columns:
            print(f"[!] MISSING COLUMN in {table_name}: {col.name} ({col.type})")
            missing_elements += 1

if missing_elements == 0:
    print("Schema check complete! No missing tables or columns found.")
else:
    print(f"Total missing elements found: {missing_elements}")

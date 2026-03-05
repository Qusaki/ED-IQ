import os
import sqlalchemy as sa
import json

engine = sa.create_engine(os.environ['DATABASE_URL'])
inspector = sa.inspect(engine)
cols = inspector.get_columns('activities')

schema = {}
for c in cols:
    schema[c['name']] = str(c['type'])

with open("activities_schema.json", "w") as f:
    json.dump(schema, f, indent=4)

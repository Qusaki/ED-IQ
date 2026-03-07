from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory

def merge_all_heads():
    try:
        # Load the alembic config
        alembic_cfg = Config("alembic.ini")
        script = ScriptDirectory.from_config(alembic_cfg)
        
        # Get all heads
        heads = script.get_heads()
        print(f"Current heads: {heads}")
        
        if len(heads) > 1:
            print(f"Merging {len(heads)} heads...")
            command.merge(alembic_cfg, heads, message="automatically merge all heads")
            print("✅ Heads merged successfully!")
        else:
            print("✓ Only one head exists. No merge needed.")
            
        return True
    except Exception as e:
        print(f"❌ Error merging heads: {str(e)}")
        return False

if __name__ == "__main__":
    merge_all_heads()

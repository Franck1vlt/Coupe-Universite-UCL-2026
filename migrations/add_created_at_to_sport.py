"""Add created_at column to Sport table

Revision ID: add_created_at_sport
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers
revision = 'add_created_at_sport'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add created_at column with default value
    op.add_column('Sport', sa.Column('created_at', sa.DateTime(), default=datetime.utcnow))
    
    # Update existing rows with current timestamp
    op.execute("UPDATE Sport SET created_at = datetime('now') WHERE created_at IS NULL")

def downgrade():
    # Remove the created_at column
    op.drop_column('Sport', 'created_at')

"""
Migration Alembic : Ajout des champs 'date' et 'time' à la table match
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('Match', sa.Column('date', sa.String(length=20), nullable=True))
    op.add_column('Match', sa.Column('time', sa.String(length=10), nullable=True))

def downgrade():
    op.drop_column('Match', 'date')
    op.drop_column('Match', 'time')

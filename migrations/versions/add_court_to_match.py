"""
Migration Alembic : Ajout du champ 'court' à la table match
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('match', sa.Column('court', sa.String(), nullable=True))

def downgrade():
    op.drop_column('match', 'court')

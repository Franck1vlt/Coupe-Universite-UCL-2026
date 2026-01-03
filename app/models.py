from datetime import datetime
from your_application import db  # Adjust the import based on your application structure

class Sport(db.Model):
    __tablename__ = 'Sport'

    # ...existing columns...
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # ...existing code...
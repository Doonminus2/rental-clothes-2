import sys
import os

# Add rental-backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'rental-backend'))

# Import Flask app from rental-backend/app.py
from app import app

# Export for Vercel
__all__ = ['app']

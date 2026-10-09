import os

# Backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data directory
DATA_DIR = os.path.join(BASE_DIR, "data")

# Create data directory automatically
os.makedirs(DATA_DIR, exist_ok=True)

# SQLite database path
DATABASE_PATH = os.path.join(
    DATA_DIR,
    "sensor_data.db"
)

# Flask settings
HOST = "0.0.0.0"
PORT = 5000
DEBUG = True

# Device information
NODE_ID = "NODE-01"
DEVICE_NAME = "Arduino UNO Q"
MODE = "DEMO"
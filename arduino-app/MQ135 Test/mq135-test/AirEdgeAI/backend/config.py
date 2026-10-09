
import os

# Backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data directory
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# SQLite database path
DATABASE_PATH = os.path.join(DATA_DIR, "sensor_data.db")

# Flask settings
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "5000"))
DEBUG = os.getenv("AIR_EDGE_DEBUG", "false").lower() == "true"

# Device information
NODE_ID = "NODE-01"
DEVICE_NAME = "Arduino UNO Q"

# This is the intended mode; actual hardware connection
# must be verified before live readings are confirmed.
MODE = "HARDWARE"

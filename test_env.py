#!/usr/bin/env python3
"""
Test script to verify .env file loading in Python
"""

from dotenv import load_dotenv
import os

# Load variables from .env file
load_dotenv()

# Access environment variables
api_key = os.getenv('API_KEY')
secret_key = os.getenv('SECRET_KEY')
db_password = os.getenv('DB_PASSWORD')

print("✅ Testing .env File Access in Python\n")
print(f"API_KEY: {api_key}")
print(f"SECRET_KEY: {secret_key}")
print(f"DB_PASSWORD: {db_password}")

# Show how to use with defaults
print(f"\nWith default value: {os.getenv('MISSING_VAR', 'default_value')}")

print("\n✅ If you see values above, .env is working!")
print("✅ If you see None, check your .env file exists and has values")

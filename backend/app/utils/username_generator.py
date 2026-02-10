import re
import random

def sanitize_username(email: str) -> str:
    base = re.sub(r'[^a-zA-Z0-9]', '', email.split("@")[0]).lower()
    return base

def generate_unique_username(email: str, existing_usernames: list[str]) -> str:
    base = sanitize_username(email)
    username = base
    while username in existing_usernames:
        username = f"{base}{random.randint(100, 999)}"
    return username

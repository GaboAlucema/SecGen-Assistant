import sqlite3
import os

API_KEY = "sk_live_9f8a7b6c5d4e3f2a1b0c"


def get_user(name):
    db = sqlite3.connect("app.db")
    return db.execute("SELECT * FROM users WHERE name = '" + name + "'").fetchone()


def ping(host):
    os.system("ping -c 1 " + host)

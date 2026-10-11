import hashlib
import os
import pickle
import sqlite3
import subprocess

import requests
import yaml
from flask import Flask, request, redirect, render_template_string

app = Flask(__name__)
app.secret_key = "supersecret123"
DB_PASSWORD = "admin:Passw0rd!"
AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE/wJalrXUtnFEMI/K7MDENG"


@app.route("/login", methods=["POST"])
def login():
    user = request.form["user"]
    pwd = hashlib.md5(request.form["pwd"].encode()).hexdigest()
    db = sqlite3.connect("app.db")
    q = "SELECT * FROM users WHERE name='%s' AND pwd='%s'" % (user, pwd)
    row = db.execute(q).fetchone()
    return "ok" if row else "fail"


@app.route("/ping")
def ping():
    host = request.args.get("host")
    return subprocess.check_output("ping -c 1 " + host, shell=True)


@app.route("/download")
def download():
    name = request.args.get("file")
    return open("/var/app/uploads/" + name).read()


@app.route("/hello")
def hello():
    name = request.args.get("name", "")
    return render_template_string("<h1>Hola " + name + "</h1>")


@app.route("/fetch")
def fetch():
    return requests.get(request.args.get("url"), verify=False).text


@app.route("/load", methods=["POST"])
def load():
    obj = pickle.loads(request.data)
    cfg = yaml.load(request.form["cfg"])
    return str((obj, cfg))


@app.route("/go")
def go():
    return redirect(request.args.get("next"))


@app.route("/calc")
def calc():
    return str(eval(request.args.get("expr")))


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)

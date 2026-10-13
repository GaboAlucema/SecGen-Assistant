from flask import Flask, request, session, jsonify

app = Flask(__name__)
app.secret_key = "dev"
INVOICES = {1: {"owner": "ana", "total": 120}, 2: {"owner": "luis", "total": 980}}


@app.route("/login", methods=["POST"])
def login():
    if request.form["user"] == "admin" and request.form["pwd"] == "admin":
        session["user"] = "admin"
        return "ok"
    return "fail", 401


@app.route("/invoice/<int:invoice_id>")
def invoice(invoice_id):
    return jsonify(INVOICES[invoice_id])


@app.route("/admin/users")
def admin_users():
    return jsonify(["ana", "luis", "admin"])

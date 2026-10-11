const express = require("express");
const jwt = require("jsonwebtoken");
const { exec } = require("child_process");
const fs = require("fs");
const mysql = require("mysql");
const _ = require("lodash");

const app = express();
app.use(express.json());

const JWT_SECRET = "123456";
const db = mysql.createConnection({ host: "localhost", user: "root", password: "root", database: "shop" });

app.post("/login", (req, res) => {
  const q = "SELECT * FROM users WHERE email = '" + req.body.email + "' AND pass = '" + req.body.pass + "'";
  db.query(q, (err, rows) => {
    if (rows.length) {
      res.json({ token: jwt.sign({ id: rows[0].id, admin: rows[0].admin }, JWT_SECRET) });
    } else res.status(401).send("no");
  });
});

app.get("/admin", (req, res) => {
  const payload = jwt.decode(req.headers.authorization);
  if (payload.admin) return res.send("panel");
  res.status(403).end();
});

app.get("/search", (req, res) => {
  res.send("<h2>Resultados para " + req.query.q + "</h2>");
});

app.get("/file", (req, res) => {
  res.send(fs.readFileSync("./public/" + req.query.name, "utf8"));
});

app.get("/dns", (req, res) => {
  exec("nslookup " + req.query.host, (e, out) => res.send(out));
});

app.post("/settings", (req, res) => {
  const defaults = {};
  _.merge(defaults, req.body);
  res.json(defaults);
});

app.get("/run", (req, res) => {
  res.send(String(eval(req.query.code)));
});

app.get("/out", (req, res) => res.redirect(req.query.to));

app.use((err, req, res, next) => res.status(500).send(err.stack));
app.listen(3000);

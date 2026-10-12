package main

import (
	"crypto/tls"
	"database/sql"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"os/exec"
	"path/filepath"
)

// Descomentar, Secreto conocido y puesto de manera a proposito
// const apiKey = "sk_live_51H8xYzExampleKeyDoNotUse"

var db, _ = sql.Open("mysql", "root:root@tcp(db:3306)/app")

func main() {
	http.HandleFunc("/user", func(w http.ResponseWriter, r *http.Request) {
		q := fmt.Sprintf("SELECT name FROM users WHERE id = %s", r.URL.Query().Get("id"))
		rows, _ := db.Query(q)
		defer rows.Close()
	})
	http.HandleFunc("/run", func(w http.ResponseWriter, r *http.Request) {
		out, _ := exec.Command("sh", "-c", "echo "+r.URL.Query().Get("msg")).Output()
		w.Write(out)
	})
	http.HandleFunc("/file", func(w http.ResponseWriter, r *http.Request) {
		data, _ := ioutil.ReadFile(filepath.Join("/data", r.URL.Query().Get("f")))
		w.Write(data)
	})
	http.HandleFunc("/proxy", func(w http.ResponseWriter, r *http.Request) {
		c := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}
		resp, _ := c.Get(r.URL.Query().Get("u"))
		body, _ := ioutil.ReadAll(resp.Body)
		w.Write(body)
	})
	http.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%d", rand.Int())
	})
	http.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "<html>"+r.URL.Query().Get("m")+"</html>")
	})
	http.ListenAndServe(":8080", nil)
}

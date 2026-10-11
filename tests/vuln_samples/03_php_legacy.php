<?php
session_start();
$conn = mysqli_connect("localhost", "root", "toor", "blog");

if (isset($_POST['login'])) {
    $u = $_POST['user'];
    $p = md5($_POST['pass']);
    $res = mysqli_query($conn, "SELECT * FROM users WHERE user='$u' AND pass='$p'");
    if (mysqli_num_rows($res) > 0) { $_SESSION['user'] = $u; }
}

if (isset($_GET['page'])) {
    include($_GET['page'] . ".php");
}

if (isset($_GET['name'])) {
    echo "<p>Bienvenido " . $_GET['name'] . "</p>";
}

if (isset($_FILES['avatar'])) {
    move_uploaded_file($_FILES['avatar']['tmp_name'], "uploads/" . $_FILES['avatar']['name']);
}

if (isset($_COOKIE['prefs'])) {
    $prefs = unserialize(base64_decode($_COOKIE['prefs']));
}

if (isset($_GET['cmd'])) {
    system("convert " . $_GET['cmd']);
}

extract($_REQUEST);
$token = rand();
setcookie("remember", $_SESSION['user'], time() + 86400 * 365);
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>

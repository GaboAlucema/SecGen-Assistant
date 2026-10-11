import java.io.*;
import java.security.MessageDigest;
import java.sql.*;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.web.bind.annotation.*;

@RestController
public class AccountController {
    private static final String DB_URL = "jdbc:mysql://db:3306/bank?user=root&password=Sup3rS3cret";
    private static final byte[] KEY = "12345678".getBytes();

    @GetMapping("/account")
    public String account(@RequestParam String id) throws Exception {
        Connection c = DriverManager.getConnection(DB_URL);
        Statement st = c.createStatement();
        ResultSet rs = st.executeQuery("SELECT * FROM accounts WHERE id = " + id);
        return rs.next() ? rs.getString("owner") : "none";
    }

    @PostMapping("/import")
    public String importXml(@RequestBody String xml) throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        return f.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes())).getDocumentElement().getNodeName();
    }

    @PostMapping("/restore")
    public Object restore(@RequestBody byte[] data) throws Exception {
        return new ObjectInputStream(new ByteArrayInputStream(data)).readObject();
    }

    @GetMapping("/exec")
    public String exec(@RequestParam String cmd) throws Exception {
        Process p = Runtime.getRuntime().exec("sh -c " + cmd);
        return new String(p.getInputStream().readAllBytes());
    }

    @GetMapping("/doc")
    public byte[] doc(@RequestParam String name) throws Exception {
        return new FileInputStream("/srv/docs/" + name).readAllBytes();
    }

    public byte[] encrypt(String s) throws Exception {
        Cipher c = Cipher.getInstance("DES/ECB/PKCS5Padding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(KEY, "DES"));
        return c.doFinal(s.getBytes());
    }

    public String hash(String pwd) throws Exception {
        return new String(MessageDigest.getInstance("MD5").digest(pwd.getBytes()));
    }
}

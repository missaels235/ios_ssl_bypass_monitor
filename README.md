# iOS SSL Bypass & Network Monitor v3.0

Script Frida para:

- Bypass de SSL pinning (incluye `SecTrustEvaluateWithError`).
- Evasión anti-tampering (`ptrace`, `exit`, `abort`, `kill`).
- Monitoreo de tráfico de `NSURLSession`, `NSURLConnection` y `WKWebView`.
- Captura de headers, cuerpos y errores.

---

## Autor

Desarrollado por **missaels235**  
GitHub: https://github.com/missaels235

---

## Requisitos

- [Frida](https://frida.re) instalado en tu PC y dispositivo iOS (jailbreak).
- Conexión USB o remota con Frida-server.

---

## Uso

```bash
git clone https://github.com/missaels235/ios-ssl-bypass-monitor.git
cd ios-ssl-bypass-monitor/frida
frida -U -f com.tu.app -l ios_ssl_bypass_monitor.js  --pause

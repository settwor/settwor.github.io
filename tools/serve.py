#!/usr/bin/env python3
"""Local preview with styles: python3 tools/serve.py  ->  open http://localhost:8000
Rebuilds the site into _preview/ on every start (press Ctrl+C, run again after edits).
Needs: pip install pyyaml markdown. Images missing locally show as broken, that is normal."""
import http.server, os, shutil, socketserver, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "_preview")
shutil.rmtree(out, ignore_errors=True)
subprocess.run([sys.executable, os.path.join(root, "tools", "preview.py"), root, out], check=True)
os.chdir(out)
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
class H(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, *a, **k):
        if code == 404 and os.path.exists("404.html"):
            self.send_response(404); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            self.wfile.write(open("404.html", "rb").read()); return
        super().send_error(code, *a, **k)
socketserver.TCPServer.allow_reuse_address = True
print(f"Open http://localhost:{port}")
socketserver.TCPServer(("", port), H).serve_forever()

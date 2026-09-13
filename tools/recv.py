#!/usr/bin/env python3
"""ブラウザから POST された JSON を data/ に保存する受信サーバー（スクレイプ用）"""
import http.server, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_GET(self):
        self.send_response(200); self._cors(); self.send_header('Content-Type','text/plain'); self.end_headers()
        self.wfile.write(b'recv ok\n')
    def do_POST(self):
        name = os.path.basename(self.path.strip('/')) or 'out.json'
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n)
        if 'application/x-www-form-urlencoded' in (self.headers.get('Content-Type') or ''):
            import urllib.parse
            q = urllib.parse.parse_qs(body.decode('utf-8'), keep_blank_values=True)
            body = (q.get('d') or [''])[0].encode('utf-8')
        with open(os.path.join(ROOT, name), 'wb') as f: f.write(body)
        self.send_response(200); self._cors(); self.end_headers()
        self.wfile.write(f'saved {name} {n}'.encode())
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv)>1 else 8766), H).serve_forever()

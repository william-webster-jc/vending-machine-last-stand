#!/usr/bin/env python3
"""
serve.py - the local web server for developing this game.

WHY THIS EXISTS instead of plain `python3 -m http.server`:

Browsers cache files aggressively. With the plain server, you edit a file,
hit refresh, and the browser quietly shows you the OLD version - so you end
up debugging a change you already made. It is maddening, and it is not your
fault.

This server sends a "don't cache any of this" header with every file, so a
refresh always gives you exactly what is on disk.

Run it with:    python3 serve.py
Then open:      http://localhost:8000
Stop it with:   Ctrl+C
"""

import http.server
import socketserver

PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # The default server prints a line for every single file request,
        # which buries anything actually worth reading.
        pass


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), NoCacheHandler) as server:
        print(f"Vending Machine Last Stand running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

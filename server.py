#!/usr/bin/env python3
"""
Simple HTTP Server for Disruptive Experience Website
"""
import http.server
import socketserver
import os
import sys

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"Server running at http://localhost:{PORT}/")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {PORT} is already in use. Trying to kill existing process...")
            os.system(f"lsof -ti:{PORT} | xargs kill -9 2>/dev/null")
            print("Retrying...")
            with socketserver.TCPServer(("", PORT), Handler) as httpd:
                print(f"Server running at http://localhost:{PORT}/")
                print("Press Ctrl+C to stop the server")
                httpd.serve_forever()
        else:
            print(f"Error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()

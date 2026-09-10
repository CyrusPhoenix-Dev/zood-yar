#!/usr/bin/env python3

import hashlib
import hmac
import os
import subprocess

from http.server import BaseHTTPRequestHandler, HTTPServer


WEBHOOK_SECRET = os.environ["ZOOD_YAR_WEBHOOK_SECRET"]


class WebhookHandler(BaseHTTPRequestHandler):

    def do_POST(self):
        if self.path != "/github-webhook":
            self.send_response(404)
            self.end_headers()
            return

        signature = self.headers.get("X-Hub-Signature-256", "")

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        expected = "sha256=" + hmac.new(
            WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected):
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b"Invalid signature")
            return

        # Only deploy pushes to main
        event = self.headers.get("X-GitHub-Event", "")

        if event != "push":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Ignored event")
            return

        try:
            subprocess.Popen(
                ["/var/www/zood-yar/deploy.sh"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Deployment started")

        except Exception:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Failed to start deployment")


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 9000), WebhookHandler)

    print("Zood-Yar webhook listening on 127.0.0.1:9000")

    server.serve_forever()

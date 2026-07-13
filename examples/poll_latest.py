#!/usr/bin/env python3
import argparse
import time
from datetime import datetime, timezone

import requests


def main() -> None:
    parser = argparse.ArgumentParser(description="Poll the newest email body")
    parser.add_argument("base_url", help="Worker URL, for example https://mail-api.example.workers.dev")
    parser.add_argument("address", help="Recipient address to poll")
    parser.add_argument("--interval", type=float, default=2.0, help="Polling interval in seconds")
    parser.add_argument("--timeout", type=float, default=120.0, help="Overall timeout in seconds")
    args = parser.parse_args()

    started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    deadline = time.monotonic() + args.timeout
    endpoint = args.base_url.rstrip("/") + "/api/messages/latest"

    while time.monotonic() < deadline:
        response = requests.get(
            endpoint,
            params={"address": args.address, "after": started_at},
            timeout=10,
        )
        response.raise_for_status()
        message = response.json()["data"]["message"]
        if message:
            print(message["text_content"] or message["html_content"])
            return
        time.sleep(args.interval)

    raise SystemExit("Timed out waiting for a new email")


if __name__ == "__main__":
    main()

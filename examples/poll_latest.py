#!/usr/bin/env python3
import argparse
import time
from datetime import datetime, timedelta, timezone

import requests

# 与 Worker 一致：东八区，毫秒三位 +08:00
CHINA = timezone(timedelta(hours=8))


def china_iso_now() -> str:
    now = datetime.now(CHINA)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}+08:00"


def main() -> None:
    parser = argparse.ArgumentParser(description="Poll the newest email body")
    parser.add_argument("base_url", help="Worker URL, for example https://mail-api.example.workers.dev")
    parser.add_argument("address", help="Recipient address to poll")
    parser.add_argument("--interval", type=float, default=2.0, help="Polling interval in seconds")
    parser.add_argument("--timeout", type=float, default=120.0, help="Overall timeout in seconds")
    args = parser.parse_args()

    started_at = china_iso_now()
    deadline = time.monotonic() + args.timeout
    endpoint = args.base_url.rstrip("/") + "/api/messages/latest"

    while time.monotonic() < deadline:
        response = requests.get(
            endpoint,
            params={"address": args.address, "after": started_at},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success"):
            raise SystemExit(payload.get("error") or payload)
        message = payload["data"]["message"]
        if message:
            print(message["text_content"] or message["html_content"])
            return
        time.sleep(args.interval)

    raise SystemExit("Timed out waiting for a new email")


if __name__ == "__main__":
    main()

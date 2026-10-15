#!/usr/bin/env python3
"""Safely format a Torah DOCX and send its paid text directly to Supabase.
Never save paid text in the public GitHub repository.
Requirements: pip install python-docx
Environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only)
Example:
  python scripts/publish_torah_docx.py "path/to/bereshit.docx" --id 5787-bereshit
Without --publish this only prints safe first-paragraph preview metadata.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

def parse_docx(path: Path):
    from docx import Document
    paragraphs = [p.text.strip() for p in Document(str(path)).paragraphs]
    title = next((x for x in paragraphs if x), "")
    blocks = []
    preview = ""
    initial_title_passed = False
    for paragraph in paragraphs:
        if not paragraph:
            continue
        if not initial_title_passed:
            initial_title_passed = True
            continue
        # The closing summary section is reserved exclusively for the planned book.
        if re.match(r"^[\s\-\u2013\u2014]*요약\s*[:：]", paragraph):
            break
        if paragraph.startswith("- "):
            blocks.append({"type": "heading", "text": paragraph[2:].strip()})
        else:
            blocks.append({"type": "paragraph", "text": paragraph})
            if not preview:
                preview = paragraph
    if not title or not preview or not blocks:
        raise ValueError("The Word document has no readable title and body.")
    return title, preview, blocks

def private_upload(url: str, key: str, entry: dict):
    address = url.rstrip("/") + "/rest/v1/torah_5787_articles?on_conflict=id"
    payload = json.dumps(entry, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        address,
        data=payload,
        method="POST",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        if response.status not in (200, 201, 204):
            raise RuntimeError("Unexpected upload status: " + str(response.status))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--id", required=True, help="Example: 5787-noach")
    parser.add_argument("--publish", action="store_true", help="Send the paid body to the PRIVATE Supabase database")
    parser.add_argument("--published-at", default=None, help="ISO 8601 UTC; defaults to now on publish")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]{3,80}", args.id):
        parser.error("Invalid article id")
    title, preview, blocks = parse_docx(args.file)
    print(json.dumps({"id":args.id,"title":title,"preview":preview,"blockCount":len(blocks)}, ensure_ascii=False, indent=2))
    if not args.publish:
        print("DRY RUN. Paid full text NOT saved anywhere.")
        return
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Missing Supabase server-side environment values; nothing was published.")
    time = args.published_at or dt.datetime.now(dt.timezone.utc).isoformat()
    entry = {"id":args.id, "title":title,"blocks":blocks,"published_at":time}
    private_upload(url, key, entry)
    print("Private lesson published successfully. Summary excluded; only the first paragraph is suitable for public GitHub.")

if __name__ == "__main__":
    main()

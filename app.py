from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time
import os

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for API requests
cache = {
    "data": None,
    "expiry": 0
}
CACHE_DURATION = 300  # 5 minutes

def get_parsed_updates(force_refresh=False):
    global cache
    now = time.time()
    if not force_refresh and cache["data"] and now < cache["expiry"]:
        return cache["data"]

    response = requests.get(FEED_URL, timeout=15)
    response.raise_for_status()

    root = ET.fromstring(response.content)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall(".//atom:entry", ns)

    all_updates = []
    update_id = 0

    for entry in entries:
        date_str = entry.find("atom:title", ns).text
        updated_iso = entry.find("atom:updated", ns).text
        content_html = entry.find("atom:content", ns).text

        if not content_html:
            continue

        soup = BeautifulSoup(content_html, 'html.parser')
        current_type = None
        current_nodes = []

        def add_upd(utype, nodes):
            nonlocal update_id
            html_content = "".join(str(c) for c in nodes).strip()
            if not html_content:
                return
            
            # Format elements inside update
            upd_soup = BeautifulSoup(html_content, 'html.parser')
            for a in upd_soup.find_all('a'):
                a['target'] = '_blank'
                a['rel'] = 'noopener noreferrer'
                a['class'] = 'release-link'
                
            plain_text = upd_soup.get_text().strip()
            # Standardize release type name
            type_name = (utype or "General").strip().capitalize()

            all_updates.append({
                "id": f"upd_{update_id}",
                "date": date_str,
                "updated_iso": updated_iso,
                "type": type_name,
                "html": str(upd_soup),
                "text": plain_text
            })
            update_id += 1

        for child in soup.children:
            if child.name in ['h2', 'h3', 'h4']:
                if current_nodes:
                    add_upd(current_type, current_nodes)
                    current_nodes = []
                current_type = child.get_text().strip()
            else:
                current_nodes.append(child)

        if current_nodes:
            add_upd(current_type, current_nodes)

    cache["data"] = all_updates
    cache["expiry"] = now + CACHE_DURATION
    return all_updates

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/updates")
def api_updates():
    try:
        force = request.args.get("refresh", "false").lower() == "true"
        updates = get_parsed_updates(force_refresh=force)
        return jsonify({
            "success": True,
            "updates": updates,
            "cached": not force and time.time() < cache["expiry"]
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Run server locally on port 5000
    app.run(host="127.0.0.1", port=5000, debug=True)

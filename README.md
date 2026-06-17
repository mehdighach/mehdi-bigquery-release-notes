# BigQuery Release Notes Hub & Tweet Composer

An elegant, premium dark-themed web dashboard that aggregates Google Cloud's BigQuery release notes and turns them into shareable updates. Built using a **Python Flask** backend and a **Vanilla HTML5/CSS3/JS** frontend, this app splits composite release entries into discrete updates, lets you search and filter them, and provides a smart, character-budgeting composer to tweet updates directly to X (Twitter).

---

## Key Features

* **📦 Atomic Update Splitting**: Automatically splits compound daily release entries into discrete cards (e.g. separating a Feature announcement from an Issue notification).
* **🎨 Premium Dark Theme**: A responsive, glassmorphic layout featuring CSS shimmer loaders, dynamic capsules, and custom micro-animations.
* **⚡ Instant Search & Filtering**: Client-side filtering by category badges (`Feature`, `Announcement`, `Issue`, `Deprecation`) and live keyword search.
* **🐦 Smart Tweet Composer**:
  * Select any update card to edit, customize, and Tweet.
  * Three predefined draft templates (Standard, Brief, Quote Style).
  * **Auto-Truncation**: Automatically calculates your remaining characters (out of 280) based on selected templates and hashtags, ensuring content never overflows.
  * **SVG Progress Ring**: A clean visual circular progress indicator that alerts you when nearing limits.
* **🚀 In-Memory Caching**: Caches parsed results for 5 minutes on the server to speed up load times and limit rate-limiting from Google's servers.

---

## Technology Stack

* **Backend**: Python 3.11+ / Flask / BeautifulSoup4 / Requests
* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
* **Icons**: [Lucide Icons](https://lucide.dev/) (via CDN)
* **Fonts**: Google Fonts (Inter & Space Grotesk)

---

## Directory Structure

```text
mehdi-bigquery-release-notes/
├── app.py                  # Main Flask application and XML parsing engine
├── templates/
│   └── index.html          # Semantic HTML dashboard and Modal Composer structure
├── static/
│   ├── css/
│   │   └── style.css       # Core stylesheet: Layout, colors, and animations
│   └── js/
│       └── app.js          # Main client-side script: state, filtering, and modal
└── .gitignore              # Configured Git exclusion patterns for Python/Flask
```

---

## Installation & Running Locally

### Prerequisites
Make sure you have **Python 3.11** or newer installed.

### Setup Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/mehdighach/mehdi-bigquery-release-notes.git
   cd mehdi-bigquery-release-notes
   ```

2. **Install dependencies**:
   ```bash
   pip install flask requests beautifulsoup4
   ```

3. **Run the Flask application**:
   ```bash
   python app.py
   ```

4. **Access the application**:
   Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## Request-Response Lifecycle Flow

```text
[ Client (Browser) ]
        │
        ▼  GET /api/updates?refresh=true
[ Flask Server (app.py) ]
        │
        ▼  Fetches XML
[ Google Cloud Feed (RSS) ]
        │
        ▼  Returns XML
[ Flask Server (app.py) ]  ──► (Parses XML & formats HTML via BeautifulSoup)
        │
        ▼  Returns JSON Response
[ Client (Browser) ]       ──► (Stops shimmer loader & renders update cards)
```

---

## License
This project is licensed under the MIT License. Feel free to modify and adapt.

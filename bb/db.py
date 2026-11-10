"""Database layer: MySQL in production, SQLite as a zero-config fallback.

Set DATABASE_URL=mysql://user:pass@host:3306/dbname to use MySQL.
Without it the app uses SQLite (local file, or /tmp on Vercel) so the demo
always runs. On Vercel's serverless runtime /tmp is temporary, so wall posts
persist only with MySQL configured.
"""
import os
import random
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, unquote

from .seed import DISTRICTS, SAMPLE_NOTE

_lock = threading.Lock()
_ready = False

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS district_metrics (
        id INTEGER PRIMARY KEY {autoinc},
        district_id VARCHAR(64) NOT NULL,
        name VARCHAR(120) NOT NULL,
        region VARCHAR(40),
        connectivity INTEGER,
        learners INTEGER,
        earning INTEGER,
        mentors INTEGER,
        hubs INTEGER,
        year INTEGER,
        source_type VARCHAR(16) NOT NULL DEFAULT 'sample',
        source_note VARCHAR(255)
    )""",
    """CREATE TABLE IF NOT EXISTS aspirations (
        id INTEGER PRIMARY KEY {autoinc},
        name VARCHAR(40),
        district_id VARCHAR(64),
        career_id VARCHAR(64) NOT NULL,
        message VARCHAR(120),
        is_seed INTEGER NOT NULL DEFAULT 0,
        created_at VARCHAR(32) NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS simulations (
        id INTEGER PRIMARY KEY {autoinc},
        district_id VARCHAR(64),
        education VARCHAR(32),
        top_career VARCHAR(64),
        match_score INTEGER,
        engine VARCHAR(32),
        created_at VARCHAR(32) NOT NULL
    )""",
]


def _is_mysql():
    return os.environ.get("DATABASE_URL", "").startswith("mysql")


def connect():
    if _is_mysql():
        import pymysql
        u = urlparse(os.environ["DATABASE_URL"])
        kw = dict(host=u.hostname, port=u.port or 3306, user=unquote(u.username or ""),
                  password=unquote(u.password or ""), database=u.path.lstrip("/"),
                  charset="utf8mb4", autocommit=True,
                  cursorclass=pymysql.cursors.DictCursor, connect_timeout=8)
        if os.environ.get("MYSQL_SSL", "").lower() in ("1", "true", "yes"):
            kw["ssl"] = {"ca": os.environ.get("MYSQL_SSL_CA") or None}
        return pymysql.connect(**kw)
    path = os.environ.get("SQLITE_PATH") or ("/tmp/beyond_boundaries.db" if os.environ.get("VERCEL") else "beyond_boundaries.db")
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = lambda c, r: {d[0]: r[i] for i, d in enumerate(c.description)}
    return conn


def query(sql, params=(), one=False, write=False):
    ensure_ready()
    conn = connect()
    try:
        if not _is_mysql():
            sql = sql.replace("%s", "?")
        cur = conn.cursor()
        cur.execute(sql, params)
        if write:
            conn.commit()
            return cur.lastrowid
        rows = cur.fetchall()
        return (rows[0] if rows else None) if one else rows
    finally:
        conn.close()


def _now(offset_minutes=0):
    return (datetime.now(timezone.utc) - timedelta(minutes=offset_minutes)).isoformat(timespec="seconds")


def ensure_ready():
    global _ready
    if _ready:
        return
    with _lock:
        if _ready:
            return
        conn = connect()
        try:
            cur = conn.cursor()
            autoinc = "AUTO_INCREMENT" if _is_mysql() else "AUTOINCREMENT"
            for stmt in SCHEMA:
                cur.execute(stmt.format(autoinc=autoinc))
            ph = "%s" if _is_mysql() else "?"
            cur.execute("SELECT COUNT(*) AS n FROM district_metrics")
            if list(cur.fetchone().values())[0] == 0:
                cur.executemany(
                    f"INSERT INTO district_metrics (district_id,name,region,connectivity,learners,earning,mentors,hubs,year,source_type,source_note) "
                    f"VALUES ({','.join([ph]*11)})",
                    [(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], 2026, "sample", SAMPLE_NOTE) for d in DISTRICTS])
            cur.execute("SELECT COUNT(*) AS n FROM aspirations")
            if list(cur.fetchone().values())[0] == 0:
                cur.executemany(
                    f"INSERT INTO aspirations (name,district_id,career_id,message,is_seed,created_at) VALUES ({','.join([ph]*6)})",
                    _seed_aspirations(ph))
            conn.commit()
        finally:
            conn.close()
        _ready = True


def _seed_aspirations(ph):
    """~140 illustrative aspirations so the wall looks alive before visitors add theirs."""
    rnd = random.Random(42)
    names = ["Mahnoor", "Sabiha", "Zarghuna", "Hani", "Gul Bano", "Nazia", "Shazia", "Palwasha", "Sammi",
             "Rukhsana", "Mehr", "Sadia", "Bibi Gul", "Saima", "Farzana", "Naseem", "Shahnaz", "Zainab",
             "Huma", "Rabia", "Sumaira", "Uzma", "Mah Gul", "Benazir", "Shireen", "Ayesha", "Kalsoom",
             "Fatima", "Sana", "Noor", "Malika", "Gulnaz", "Saba", "Haleema", "Asma", "Zubaida", "Mahrang",
             "Sammo", "Bano", "Hawa", "Gul Jan", "Sharifa", "Zarina", "Laila", "Naz", "Durr-e-Shahwar", None]
    msgs = {
        "graphic-design": ["Design the brand of a Balochi embroidery label", "Make posters the whole province remembers"],
        "content-writing": ["Write stories the world reads", "Blog about Makran's coast for travellers"],
        "translation": ["Carry my languages to the world", "Translate health guides into Brahui"],
        "virtual-assistance": ["Run operations for a global startup", "Work for clients in three time zones"],
        "social-media": ["Grow local brands online", "Put Quetta's cafes on Instagram"],
        "web-development": ["Build websites for every school in my district", "Code apps from Gwadar"],
        "data-annotation": ["Teach AI to understand Balochi", "Help AI hear our accents"],
        "data-analysis": ["Use data to bring clinics closer", "Find patterns that help farmers"],
        "online-tutoring": ["Teach maths to students everywhere", "Tutor girls who can't reach a school"],
        "video-editing": ["Show Makran to the world on film", "Edit documentaries about my mountains"],
        "ui-ux-design": ["Design apps my mother can use", "Make forms simple for everyone"],
        "ecommerce": ["Take local crafts to global buyers", "Sell Kharan carpets online"],
    }
    careers = list(msgs)
    cweights = [9, 8, 7, 6, 8, 7, 6, 4, 7, 5, 4, 6]
    districts = [d[0] for d in DISTRICTS]
    dweights = [max(d[4], 40) for d in DISTRICTS]
    rows, n = [], 140
    for i in range(n):
        c = rnd.choices(careers, cweights)[0]
        msg = rnd.choice(msgs[c]) if rnd.random() < .55 else None
        rows.append((rnd.choice(names), rnd.choices(districts, dweights)[0], c, msg, 1, _now(25 * (n - i))))
    return rows

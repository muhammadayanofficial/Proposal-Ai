import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

COLUMNS = (
    "id, title, client_name, category, tone, brief, budget, deadline, "
    "proposal_text, created_at, updated_at"
)


def _db_path():
    return os.getenv("DATABASE_PATH") or os.path.join(BASE_DIR, "proposalpilot.db")


def _connect():
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def init_db():
    with closing(_connect()) as conn, conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS proposals (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                title         TEXT NOT NULL,
                client_name   TEXT NOT NULL,
                category      TEXT NOT NULL DEFAULT 'Other',
                tone          TEXT NOT NULL DEFAULT 'Professional',
                brief         TEXT NOT NULL,
                budget        TEXT NOT NULL DEFAULT '',
                deadline      TEXT NOT NULL DEFAULT '',
                proposal_text TEXT NOT NULL,
                created_at    TEXT NOT NULL,
                updated_at    TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_proposals_updated ON proposals (updated_at DESC)"
        )


def list_proposals(limit=25):
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT id, title, client_name, updated_at FROM proposals "
            "ORDER BY updated_at DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_proposal(proposal_id):
    with closing(_connect()) as conn:
        row = conn.execute(
            f"SELECT {COLUMNS} FROM proposals WHERE id = ?", (proposal_id,)
        ).fetchone()
    return dict(row) if row else None


def create_proposal(fields):
    now = _now()
    with closing(_connect()) as conn, conn:
        cur = conn.execute(
            """
            INSERT INTO proposals
                (title, client_name, category, tone, brief, budget, deadline,
                 proposal_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fields["title"], fields["client_name"], fields["category"],
                fields["tone"], fields["brief"], fields["budget"],
                fields["deadline"], fields["proposal_text"], now, now,
            ),
        )
        new_id = cur.lastrowid
    return get_proposal(new_id)


def update_proposal(proposal_id, fields):
    with closing(_connect()) as conn, conn:
        cur = conn.execute(
            """
            UPDATE proposals
               SET title = ?, client_name = ?, category = ?, tone = ?, brief = ?,
                   budget = ?, deadline = ?, proposal_text = ?, updated_at = ?
             WHERE id = ?
            """,
            (
                fields["title"], fields["client_name"], fields["category"],
                fields["tone"], fields["brief"], fields["budget"],
                fields["deadline"], fields["proposal_text"], _now(), proposal_id,
            ),
        )
        if cur.rowcount == 0:
            return None
    return get_proposal(proposal_id)


def delete_proposal(proposal_id):
    with closing(_connect()) as conn, conn:
        cur = conn.execute("DELETE FROM proposals WHERE id = ?", (proposal_id,))
        return cur.rowcount > 0

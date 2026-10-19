#!/usr/bin/env python3
"""Local life-insurance book-of-business tracker.

Runs a small web app on http://127.0.0.1:8000 backed by a SQLite file.
Standard library only — no pip install needed.

    python3 book-of-business/server.py [--port 8000] [--db path/to/book.db]
"""

import argparse
import csv
import io
import json
import sqlite3
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
STATIC_DIR = HERE / "static"
DEFAULT_DB = HERE / "data" / "book.db"

CLIENT_FIELDS = [
    "first_name", "last_name", "dob", "phone", "email",
    "address", "city", "state", "zip", "source", "notes",
]
POLICY_FIELDS = [
    "client_id", "carrier", "product_type", "product_name", "policy_number",
    "status", "face_amount", "annual_premium", "payment_mode", "app_date",
    "effective_date", "commission_rate", "commission_paid", "chargeback",
    "beneficiary", "follow_up_date", "notes",
]
NUMERIC_POLICY_FIELDS = {
    "face_amount", "annual_premium", "commission_rate",
    "commission_paid", "chargeback",
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    dob TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    zip TEXT DEFAULT '',
    source TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    carrier TEXT DEFAULT '',
    product_type TEXT DEFAULT '',
    product_name TEXT DEFAULT '',
    policy_number TEXT DEFAULT '',
    status TEXT DEFAULT 'Submitted',
    face_amount REAL DEFAULT 0,
    annual_premium REAL DEFAULT 0,
    payment_mode TEXT DEFAULT 'Monthly',
    app_date TEXT DEFAULT '',
    effective_date TEXT DEFAULT '',
    commission_rate REAL DEFAULT 0,
    commission_paid REAL DEFAULT 0,
    chargeback REAL DEFAULT 0,
    beneficiary TEXT DEFAULT '',
    follow_up_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_policies_client ON policies(client_id);
"""

# CSV import/export column order: client columns, then policy columns.
CSV_COLUMNS = CLIENT_FIELDS + [f for f in POLICY_FIELDS if f != "client_id"]
CLIENT_CSV_PREFIXED = {"notes": "client_notes"}


def now():
    return datetime.now().isoformat(timespec="seconds")


def to_number(value):
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("$", "").replace(",", "").replace("%", "")
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        raise ValueError(f"not a number: {value!r}")


class Store:
    def __init__(self, db_path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as conn:
            conn.executescript(SCHEMA)

    def connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    # --- clients -------------------------------------------------------
    def list_clients(self):
        with self.connect() as conn:
            rows = conn.execute(
                """SELECT c.*, COUNT(p.id) AS policy_count,
                          COALESCE(SUM(CASE WHEN p.status IN ('In Force', 'Issued')
                                       THEN p.annual_premium END), 0) AS inforce_premium
                   FROM clients c LEFT JOIN policies p ON p.client_id = c.id
                   GROUP BY c.id ORDER BY c.last_name, c.first_name"""
            ).fetchall()
        return [dict(r) for r in rows]

    def save_client(self, data, client_id=None, conn=None):
        values = {f: str(data.get(f) or "").strip() for f in CLIENT_FIELDS}
        if not (values["first_name"] or values["last_name"]):
            raise ValueError("Client needs a first or last name")
        own = conn is None
        conn = conn or self.connect()
        try:
            if client_id is None:
                values["created_at"] = values["updated_at"] = now()
                cols = ", ".join(values)
                marks = ", ".join("?" for _ in values)
                cur = conn.execute(
                    f"INSERT INTO clients ({cols}) VALUES ({marks})", list(values.values())
                )
                client_id = cur.lastrowid
            else:
                values["updated_at"] = now()
                sets = ", ".join(f"{k} = ?" for k in values)
                cur = conn.execute(
                    f"UPDATE clients SET {sets} WHERE id = ?", [*values.values(), client_id]
                )
                if cur.rowcount == 0:
                    raise LookupError("Client not found")
            if own:
                conn.commit()
            return client_id
        finally:
            if own:
                conn.close()

    def delete_client(self, client_id):
        with self.connect() as conn:
            cur = conn.execute("DELETE FROM clients WHERE id = ?", (client_id,))
            if cur.rowcount == 0:
                raise LookupError("Client not found")

    # --- policies ------------------------------------------------------
    def list_policies(self):
        with self.connect() as conn:
            rows = conn.execute(
                """SELECT p.*, c.first_name, c.last_name, c.dob, c.phone, c.email, c.state
                   FROM policies p JOIN clients c ON c.id = p.client_id
                   ORDER BY COALESCE(NULLIF(p.app_date, ''), p.created_at) DESC"""
            ).fetchall()
        return [dict(r) for r in rows]

    def save_policy(self, data, policy_id=None, conn=None):
        values = {}
        for f in POLICY_FIELDS:
            if f in NUMERIC_POLICY_FIELDS:
                values[f] = to_number(data.get(f))
            elif f == "client_id":
                try:
                    values[f] = int(data.get(f))
                except (TypeError, ValueError):
                    raise ValueError("Policy needs a client")
            else:
                values[f] = str(data.get(f) or "").strip()
        own = conn is None
        conn = conn or self.connect()
        try:
            if not conn.execute("SELECT 1 FROM clients WHERE id = ?", (values["client_id"],)).fetchone():
                raise ValueError("Policy needs a valid client")
            if policy_id is None:
                values["created_at"] = values["updated_at"] = now()
                cols = ", ".join(values)
                marks = ", ".join("?" for _ in values)
                cur = conn.execute(
                    f"INSERT INTO policies ({cols}) VALUES ({marks})", list(values.values())
                )
                policy_id = cur.lastrowid
            else:
                values["updated_at"] = now()
                sets = ", ".join(f"{k} = ?" for k in values)
                cur = conn.execute(
                    f"UPDATE policies SET {sets} WHERE id = ?", [*values.values(), policy_id]
                )
                if cur.rowcount == 0:
                    raise LookupError("Policy not found")
            if own:
                conn.commit()
            return policy_id
        finally:
            if own:
                conn.close()

    def delete_policy(self, policy_id):
        with self.connect() as conn:
            cur = conn.execute("DELETE FROM policies WHERE id = ?", (policy_id,))
            if cur.rowcount == 0:
                raise LookupError("Policy not found")

    # --- CSV -----------------------------------------------------------
    def export_csv(self):
        header = [CLIENT_CSV_PREFIXED.get(c, c) for c in CLIENT_FIELDS] + CSV_COLUMNS[len(CLIENT_FIELDS):]
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(header)
        with self.connect() as conn:
            rows = conn.execute(
                """SELECT c.first_name, c.last_name, c.dob, c.phone, c.email, c.address,
                          c.city, c.state, c.zip, c.source, c.notes AS client_notes,
                          p.carrier, p.product_type, p.product_name, p.policy_number,
                          p.status, p.face_amount, p.annual_premium, p.payment_mode,
                          p.app_date, p.effective_date, p.commission_rate,
                          p.commission_paid, p.chargeback, p.beneficiary,
                          p.follow_up_date, p.notes
                   FROM clients c LEFT JOIN policies p ON p.client_id = c.id
                   ORDER BY c.last_name, c.first_name, p.app_date"""
            ).fetchall()
        for r in rows:
            writer.writerow([
                "" if v is None else (int(v) if isinstance(v, float) and v.is_integer() else v)
                for v in r
            ])
        return buf.getvalue()

    def import_csv(self, text):
        """Import rows of client+policy data. Clients are matched on
        first name + last name + DOB so re-importing doesn't duplicate them."""
        reader = csv.DictReader(io.StringIO(text.lstrip("﻿")))
        if not reader.fieldnames:
            raise ValueError("CSV is empty")
        norm = {h: h.strip().lower().replace(" ", "_") for h in reader.fieldnames}
        clients_added = policies_added = policies_skipped = 0
        conn = self.connect()
        try:
            for line_no, raw in enumerate(reader, start=2):
                row = {norm[k]: (v or "").strip() for k, v in raw.items() if k is not None}
                client = {f: row.get(CLIENT_CSV_PREFIXED.get(f, f), "") for f in CLIENT_FIELDS}
                if not (client["first_name"] or client["last_name"]):
                    continue
                existing = conn.execute(
                    """SELECT id FROM clients WHERE lower(first_name) = lower(?)
                       AND lower(last_name) = lower(?) AND dob = ?""",
                    (client["first_name"], client["last_name"], client["dob"]),
                ).fetchone()
                if existing:
                    client_id = existing["id"]
                else:
                    client_id = self.save_client(client, conn=conn)
                    clients_added += 1
                policy = {f: row.get(f, "") for f in POLICY_FIELDS if f != "client_id"}
                if any(policy[f] for f in ("carrier", "policy_number", "product_type", "annual_premium", "face_amount")):
                    policy["client_id"] = client_id
                    policy["status"] = policy["status"] or "Submitted"
                    if self._policy_exists(conn, client_id, policy):
                        policies_skipped += 1
                        continue
                    try:
                        self.save_policy(policy, conn=conn)
                    except ValueError as e:
                        raise ValueError(f"Row {line_no}: {e}")
                    policies_added += 1
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        return {
            "clients_added": clients_added,
            "policies_added": policies_added,
            "policies_skipped": policies_skipped,
        }

    @staticmethod
    def _policy_exists(conn, client_id, policy):
        """Duplicate check for imports: same policy number, or (when there is
        no number) same carrier + product type + application date."""
        if policy["policy_number"]:
            sql = "SELECT 1 FROM policies WHERE client_id = ? AND policy_number = ?"
            args = (client_id, policy["policy_number"])
        else:
            sql = """SELECT 1 FROM policies WHERE client_id = ? AND policy_number = ''
                     AND lower(carrier) = lower(?) AND product_type = ? AND app_date = ?"""
            args = (client_id, policy["carrier"], policy["product_type"], policy["app_date"])
        return conn.execute(sql, args).fetchone() is not None


class Handler(BaseHTTPRequestHandler):
    store: Store = None

    def log_message(self, fmt, *args):
        pass  # keep the console quiet

    # --- helpers -------------------------------------------------------
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status, message):
        self.send_json({"error": message}, status)

    def read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length).decode("utf-8") if length else ""

    def read_json(self):
        text = self.read_body()
        return json.loads(text) if text else {}

    def route(self):
        parts = [p for p in urlparse(self.path).path.split("/") if p]
        if len(parts) >= 2 and parts[0] == "api":
            resource = parts[1]
            item_id = None
            if len(parts) == 3:
                if not parts[2].isdigit():
                    return resource, "bad"
                item_id = int(parts[2])
            elif len(parts) > 3:
                return resource, "bad"
            return resource, item_id
        return None, None

    def handle_api(self, method):
        resource, item_id = self.route()
        if item_id == "bad":
            return self.send_error_json(404, "Not found")
        try:
            if resource == "clients":
                if method == "GET" and item_id is None:
                    return self.send_json(self.store.list_clients())
                if method == "POST" and item_id is None:
                    return self.send_json({"id": self.store.save_client(self.read_json())}, 201)
                if method == "PUT" and item_id is not None:
                    return self.send_json({"id": self.store.save_client(self.read_json(), item_id)})
                if method == "DELETE" and item_id is not None:
                    self.store.delete_client(item_id)
                    return self.send_json({"ok": True})
            elif resource == "policies":
                if method == "GET" and item_id is None:
                    return self.send_json(self.store.list_policies())
                if method == "POST" and item_id is None:
                    return self.send_json({"id": self.store.save_policy(self.read_json())}, 201)
                if method == "PUT" and item_id is not None:
                    return self.send_json({"id": self.store.save_policy(self.read_json(), item_id)})
                if method == "DELETE" and item_id is not None:
                    self.store.delete_policy(item_id)
                    return self.send_json({"ok": True})
            elif resource == "export" and method == "GET":
                body = self.store.export_csv().encode("utf-8")
                stamp = datetime.now().strftime("%Y-%m-%d")
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="book-of-business-{stamp}.csv"')
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                return self.wfile.write(body)
            elif resource == "import" and method == "POST":
                return self.send_json(self.store.import_csv(self.read_body()))
            return self.send_error_json(404, "Not found")
        except json.JSONDecodeError:
            return self.send_error_json(400, "Invalid JSON")
        except LookupError as e:
            return self.send_error_json(404, str(e))
        except (ValueError, csv.Error) as e:
            return self.send_error_json(400, str(e))

    def serve_static(self):
        path = urlparse(self.path).path
        if path in ("", "/"):
            path = "/index.html"
        target = (STATIC_DIR / path.lstrip("/")).resolve()
        if STATIC_DIR not in target.parents or not target.is_file():
            self.send_response(404)
            self.end_headers()
            return
        types = {".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml"}
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", types.get(target.suffix, "application/octet-stream") + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    # --- verbs ---------------------------------------------------------
    def do_GET(self):
        if urlparse(self.path).path.startswith("/api/"):
            return self.handle_api("GET")
        return self.serve_static()

    def do_POST(self):
        return self.handle_api("POST")

    def do_PUT(self):
        return self.handle_api("PUT")

    def do_DELETE(self):
        return self.handle_api("DELETE")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", default="127.0.0.1", help="Keep 127.0.0.1 so only this computer can reach it")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite file holding your book")
    args = parser.parse_args()

    Handler.store = Store(args.db)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Book of Business running at http://{args.host}:{args.port}")
    print(f"Data file: {Path(args.db).resolve()}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()

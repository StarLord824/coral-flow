"""Apply db/schema.sql to the Supabase Postgres via the direct connection string.

    python -m db.apply_schema     (run from backend/, with SUPABASE_DIRECT_CONN_STRING in .env)
"""
import os
import pathlib
import sys

import psycopg
from dotenv import load_dotenv

load_dotenv()

conn_str = os.environ.get("SUPABASE_DIRECT_CONN_STRING")
if not conn_str:
    sys.exit("SUPABASE_DIRECT_CONN_STRING not set")

sql = (pathlib.Path(__file__).parent / "schema.sql").read_text()

with psycopg.connect(conn_str, autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute(sql)
        # quick verification
        cur.execute(
            "select table_name from information_schema.tables "
            "where table_schema='public' order by table_name"
        )
        tables = [r[0] for r in cur.fetchall()]
print("Applied. public tables:", tables)

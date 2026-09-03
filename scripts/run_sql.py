"""Run a .sql file against DATABASE_URL. For machines without psql installed.

    python scripts/run_sql.py scripts/staging_schema.sql
"""
import os
import sys

import psycopg2


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/run_sql.py <path-to-sql-file>", file=sys.stderr)
        sys.exit(1)

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set.", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        sql = f.read()

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print(f"Ran {sys.argv[1]} successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

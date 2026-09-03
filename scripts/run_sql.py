"""Run a .sql file against DATABASE_URL, statement by statement, printing any
result rows along the way. For machines without psql installed.

    python scripts/run_sql.py scripts/staging_schema.sql

Note: splits on ';' naively, so it can't handle a semicolon inside a string
literal. Fine for this repo's own scripts; not a general-purpose SQL runner.
"""
import os
import sys

import psycopg2


def split_statements(sql: str) -> list[str]:
    """Split on top-level ';', respecting -- comments, /* */ comments, and
    '...' string literals (with '' escaping) so a semicolon inside any of
    those doesn't end a statement early."""
    statements = []
    current = []
    i, n = 0, len(sql)
    while i < n:
        c = sql[i]
        if sql.startswith("--", i):
            end = sql.find("\n", i)
            end = n if end == -1 else end
            current.append(sql[i:end])
            i = end
        elif sql.startswith("/*", i):
            end = sql.find("*/", i + 2)
            end = n if end == -1 else end + 2
            current.append(sql[i:end])
            i = end
        elif c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'" and sql[j : j + 2] != "''":
                    j += 1
                    break
                j += 2 if sql[j : j + 2] == "''" else 1
            current.append(sql[i:j])
            i = j
        elif c == ";":
            statements.append("".join(current))
            current = []
            i += 1
        else:
            current.append(c)
            i += 1
    if "".join(current).strip():
        statements.append("".join(current))

    def is_sql(stmt: str) -> bool:
        lines = [l for l in stmt.splitlines() if l.strip() and not l.strip().startswith("--")]
        return bool(lines)

    return [s.strip() for s in statements if s.strip() and is_sql(s)]


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

    statements = split_statements(sql)

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            for stmt in statements:
                cur.execute(stmt)
                if cur.description:
                    cols = [c.name for c in cur.description]
                    print("\t".join(cols))
                    for row in cur.fetchall():
                        print("\t".join(str(v) for v in row))
        conn.commit()
        print(f"Ran {sys.argv[1]} successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

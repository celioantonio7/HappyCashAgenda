"""Run audit migration and ownership/reversal checks in an isolated, disposable Postgres database.

Usage: python3 scripts/test-audit-reversal.py <local-postgres-container>
The supplied container must be local and have postgres, anon and authenticated roles.
"""
import pathlib
import subprocess
import sys
import uuid

root = pathlib.Path(__file__).resolve().parents[1]
container = sys.argv[1] if len(sys.argv) > 1 else "supabase_db_aravkvbwubskrxosyheb"
database = "audit_test_" + uuid.uuid4().hex


def run(*args: str, sql: str | None = None) -> None:
    subprocess.run(["docker", "exec", "-i", container, *args], input=sql, text=True, check=True)


run("createdb", "-U", "postgres", database)
try:
    for path in ["supabase/tests/audit_bootstrap.sql", "supabase/migrations/20261027150000_agenda_audit.sql", "supabase/tests/audit_reversal.sql"]:
        run("psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", sql=(root / path).read_text())
finally:
    run("dropdb", "-U", "postgres", database)

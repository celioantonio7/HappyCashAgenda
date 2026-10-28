"""Run client enrollment migration and tenant checks in an isolated, disposable Postgres database.

Usage: python3 scripts/test-client-enrollment.py <local-postgres-container>
The supplied container must be local and have postgres, anon and authenticated roles.
"""
import pathlib
import subprocess
import sys
import uuid

root = pathlib.Path(__file__).resolve().parents[1]
container = sys.argv[1] if len(sys.argv) > 1 else "supabase_db_aravkvbwubskrxosyheb"
database = "enrollment_test_" + uuid.uuid4().hex


def run(*args: str, sql: str | None = None) -> None:
    subprocess.run(["docker", "exec", "-i", container, *args], input=sql, text=True, check=True)


run("createdb", "-U", "postgres", database)
try:
    for path in ["supabase/tests/client_enrollment_bootstrap.sql", "supabase/migrations/20261027141000_agenda_client_enrollment.sql", "supabase/tests/client_enrollment.sql"]:
        run("psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", sql=(root / path).read_text())
finally:
    run("dropdb", "-U", "postgres", database)

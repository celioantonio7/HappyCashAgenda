#!/usr/bin/env bash
set -euo pipefail
# Disposable minimal schema tests the feed migration's RLS independently of production data.
feed_test_container="agenda-feed-test-$$"
trap 'docker rm -f "$feed_test_container" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$feed_test_container" -e POSTGRES_PASSWORD=postgres postgres:17-alpine >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$feed_test_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$feed_test_container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/fixtures/feed_schema.sql
docker exec -i "$feed_test_container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261027143000_agenda_feed_posts.sql
docker exec -i "$feed_test_container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261028001314_feed_optional_caption.sql
docker exec -i "$feed_test_container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/feed_rls.sql

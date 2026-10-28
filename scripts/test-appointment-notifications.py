"""Checks event persistence, recipient deduplication and inbox RLS in disposable Postgres."""
import subprocess, uuid, time
from pathlib import Path
container = 'agenda-notifications-test-' + uuid.uuid4().hex[:8]
command = ['docker','exec','-i',container,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At']
def sql(value, success=True):
    result = subprocess.run(command, input=value, text=True, capture_output=True)
    if success and result.returncode: raise RuntimeError(result.stderr)
    return result
subprocess.run(['docker','run','-d','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'], check=True, capture_output=True)
try:
    for _ in range(100):
        if subprocess.run(['docker','exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],capture_output=True).returncode == 0: break
        time.sleep(.1)
    sql('''CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA agenda_private; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
      CREATE TABLE agenda_private.barber_sessions(barber_id uuid,token_hash text,expires_at timestamptz);
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
      CREATE TABLE store_accounts(id uuid PRIMARY KEY,owner_user_id uuid);
      CREATE TABLE barbers(id uuid PRIMARY KEY,user_id uuid,store_account_id uuid,is_active boolean DEFAULT true);
      CREATE TABLE agenda_clients(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,store_account_id uuid,name text);
      CREATE TABLE agenda_business_settings(store_account_id uuid,slug text,reminder_enabled boolean DEFAULT true,reminder_24h_enabled boolean DEFAULT false,reminder_2h_enabled boolean DEFAULT false,reminder_30m_enabled boolean DEFAULT true);
      CREATE FUNCTION agenda_private.can_work(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE FUNCTION public.verify_barber_session(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE TABLE appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid,store_account_id uuid,barber_id uuid,client_name text,appointment_date date,appointment_time time,status text DEFAULT 'scheduled');''')
    sql((Path(__file__).resolve().parents[1] / 'supabase/migrations/20261027144000_appointment_notifications.sql').read_text())
    owner, client, stranger, store, barber = [str(uuid.uuid4()) for _ in range(5)]
    sql(f"INSERT INTO auth.users VALUES ('{owner}'),('{client}'),('{stranger}'); INSERT INTO store_accounts VALUES ('{store}','{owner}'); INSERT INTO barbers(id,user_id,store_account_id) VALUES ('{barber}','{owner}','{store}'); INSERT INTO agenda_business_settings(store_account_id,slug) VALUES('{store}','test');")
    appointment = sql(f"INSERT INTO appointments(client_id,store_account_id,barber_id,client_name,appointment_date,appointment_time) VALUES ('{client}','{store}','{barber}','Cliente','2030-01-01','10:00') RETURNING id;").stdout.splitlines()[0]
    assert sql('SELECT count(*) FROM agenda_notifications').stdout.splitlines()[0] == '2', 'owner who cuts must receive one event'
    sql(f"UPDATE appointments SET appointment_time='11:00' WHERE id='{appointment}'; UPDATE appointments SET client_name='Cliente corrigido' WHERE id='{appointment}'; UPDATE appointments SET status='cancelled' WHERE id='{appointment}';")
    assert sql("SELECT string_agg(event_type,',' ORDER BY event_type) FROM agenda_notifications WHERE recipient_id='"+client+"';").stdout.splitlines()[0] == 'cancelled,rescheduled,scheduled'
    assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{stranger}'; SELECT count(*) FROM agenda_notifications;").stdout.splitlines()[-1] == '0'
    assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{client}'; UPDATE agenda_notifications SET read_at=now(); SELECT count(*) FROM agenda_notifications WHERE read_at IS NOT NULL;").stdout.splitlines()[-1] == '3'
    assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{client}'; UPDATE agenda_notifications SET title='forged';", False).returncode != 0
    # Native push pipeline: real migration, private outbox and subscription identity changes.
    sql((Path(__file__).resolve().parents[1] / 'supabase/migrations/20261027145000_native_web_push.sql').read_text())
    endpoint='https://fcm.googleapis.com/fcm/send/test-device'
    import json
    subscription=json.dumps({'endpoint':endpoint,'keys':{'p256dh':'A'*87,'auth':'A'*22}})
    sql(f"INSERT INTO agenda_clients(user_id,store_account_id,name) VALUES('{client}','{store}','Cliente');")
    assert sql("SELECT count(*) FROM agenda_notifications WHERE event_type='new_client';").stdout.splitlines()[0] == '1'
    sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{owner}'; SELECT public.register_agenda_push('{store}','{subscription}'::jsonb);")
    sql(f"UPDATE appointments SET status='scheduled',appointment_date=((now() AT TIME ZONE 'America/Sao_Paulo')+interval '29 minutes')::date,appointment_time=((now() AT TIME ZONE 'America/Sao_Paulo')+interval '29 minutes')::time WHERE id='{appointment}';")
    assert sql('SELECT count(*) FROM agenda_private.push_deliveries').stdout.splitlines()[0] == '1'
    assert sql('SELECT enqueue_agenda_reminders();').stdout.splitlines()[0] == '2'
    assert sql('SELECT enqueue_agenda_reminders();').stdout.splitlines()[0] == '0'
    assert sql('SELECT count(*) FROM claim_agenda_push_batch();').stdout.splitlines()[0] == '2'
    # Claim has a lease; concurrent worker cannot immediately claim again.
    assert sql('SELECT count(*) FROM claim_agenda_push_batch();').stdout.splitlines()[0] == '0'
    assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{stranger}'; SELECT public.register_agenda_push('{store}','{subscription}'::jsonb);",False).returncode != 0
    assert sql('SET ROLE authenticated; SELECT * FROM claim_agenda_push_batch();',False).returncode != 0
    # One user and one endpoint can keep subscriptions to multiple businesses.
    other_store=str(uuid.uuid4())
    sql(f"INSERT INTO store_accounts VALUES('{other_store}','{owner}');")
    sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{owner}'; SELECT public.register_agenda_push('{other_store}','{subscription}'::jsonb);")
    assert sql('SELECT count(*) FROM agenda_private.push_subscriptions').stdout.splitlines()[0] == '2'
    assert sql('SELECT count(*) FROM agenda_private.push_deliveries').stdout.splitlines()[0] == '2'
    # Same device re-registered for a new account cannot receive former account deliveries.
    sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{client}'; SELECT public.register_agenda_push('{store}','{subscription}'::jsonb);")
    assert sql('SELECT count(*) FROM agenda_private.push_deliveries').stdout.splitlines()[0] == '0'
    assert sql('SELECT count(*) FROM agenda_private.push_subscriptions').stdout.splitlines()[0] == '1'
    assert sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{client}'; SELECT public.register_agenda_push('{store}','{{\"endpoint\":\"https://127.0.0.1/private\"}}'::jsonb);",False).returncode != 0
    legacy_barber=str(uuid.uuid4())
    sql(f"INSERT INTO barbers(id,user_id,store_account_id) VALUES('{legacy_barber}',NULL,'{store}'); INSERT INTO agenda_private.barber_sessions VALUES('{legacy_barber}',encode(extensions.digest('valid-token','sha256'),'hex'),now()+interval '1 hour');")
    sql("CREATE OR REPLACE FUNCTION public.verify_barber_session(p_id uuid,p_token text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM agenda_private.barber_sessions WHERE barber_id=p_id AND token_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND expires_at>now()) $$; CREATE OR REPLACE FUNCTION agenda_private.can_work(p_id uuid,p_token text) RETURNS boolean LANGUAGE sql AS $$ SELECT public.verify_barber_session(p_id,p_token) $$;")
    legacy_subscription=subscription.replace('test-device','legacy-device')
    assert sql(f"SET ROLE anon; SELECT register_agenda_push('{store}','{legacy_subscription}'::jsonb,'{legacy_barber}','wrong-token');",False).returncode != 0
    sql(f"SET ROLE anon; SELECT register_agenda_push('{store}','{legacy_subscription}'::jsonb,'{legacy_barber}','valid-token');")
    assert sql("SELECT count(*) FROM agenda_private.push_subscriptions WHERE barber_id IS NOT NULL AND expires_at IS NOT NULL;").stdout.splitlines()[0] == '1'
    print('PASS: native push registration authorization, outbox/claim lease, reminder dedup, account switch privacy, multi-store memberships, legacy session validation/expiry, endpoint restrictions')
    print('PASS: persisted scheduled/rescheduled/cancelled events, owner/barber dedup, recipient RLS and column grants')
finally:
    subprocess.run(['docker','rm','-f',container],capture_output=True)

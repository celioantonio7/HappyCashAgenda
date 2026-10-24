import subprocess,uuid,json,time
from pathlib import Path

# Uses an isolated, disposable PostgreSQL container; never production credentials.
container = "happycash-booking-test-" + uuid.uuid4().hex[:10]
P=['docker','exec','-i',container,'psql','-h','127.0.0.1','-X','-U','postgres','-v','ON_ERROR_STOP=1','-At']
def sql(s,ok=True):
 r=subprocess.run(P,input=s,text=True,capture_output=True)
 if ok and r.returncode:raise RuntimeError(r.stderr)
 return r
subprocess.run(['docker','run','-d','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],check=True,capture_output=True)
try:
    for attempt in range(100):
        if subprocess.run(['docker','exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],capture_output=True).returncode == 0:
            break
        time.sleep(0.1)
    else:
        raise RuntimeError('Test PostgreSQL did not become ready')
    sql("CREATE SCHEMA extensions;\nCREATE ROLE anon; CREATE ROLE authenticated;\nCREATE TABLE public.services(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),duration_minutes integer NOT NULL);\nCREATE TABLE public.appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),barber_id uuid NOT NULL,service_id uuid NOT NULL REFERENCES public.services(id),appointment_date date NOT NULL,appointment_time time NOT NULL,status text NOT NULL DEFAULT 'scheduled',appointment_type text DEFAULT 'appointment');\nCREATE TABLE public.appointment_services(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,service_id uuid REFERENCES public.services(id));\n")
    migration = Path(__file__).resolve().parents[1] / 'supabase/migrations/20261024160000_enforce_booking_exclusion.sql'
    sql(migration.read_text())
    service=str(uuid.uuid4());extra=str(uuid.uuid4());barber=str(uuid.uuid4())
    sql(f"INSERT INTO services VALUES ('{service}',30),('{extra}',30);")
    def insert(t='10:00',date='2030-01-01',who=barber,status='scheduled',kind='appointment'):
     return f"INSERT INTO appointments(barber_id,service_id,appointment_date,appointment_time,status,appointment_type) VALUES ('{who}','{service}','{date}','{t}','{status}','{kind}') RETURNING id;"
    # Hold the first transaction open while the second connection attempts the same slot.
    p=subprocess.Popen(P,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    p.stdin.write('BEGIN;\n'+insert()+"SELECT 'FIRST_INSERTED'; SELECT pg_sleep(1.5); COMMIT;\n");p.stdin.close()
    while True:
     line=p.stdout.readline()
     if 'FIRST_INSERTED' in line:break
     if not line:raise RuntimeError(p.stderr.read())
    second=sql(insert(),False);assert second.returncode and 'appointments_no_overlap' in second.stderr,second
    p.wait();assert p.returncode==0,p.stderr.read()
    assert sql(f"SELECT count(*) FROM appointments WHERE barber_id='{barber}' AND appointment_date='2030-01-01';").stdout.strip()=='1'
    results=['simultaneous identical slot: one commit, one database rejection']
    assert sql(insert('10:15'),False).returncode
    results.append('overlapping duration rejected')
    sql(insert('10:30'));results.append('back-to-back appointments accepted')
    sql(insert(who=str(uuid.uuid4())));results.append('different professionals accepted')
    sql(insert(status='cancelled'));sql(insert(kind='queue'));results.append('cancelled and queue entries do not reserve slots')
    a=sql(insert('12:00')).stdout.splitlines()[0]
    assert sql(f"UPDATE appointments SET appointment_time='10:00' WHERE id='{a}';",False).returncode
    results.append('conflicting reschedule rejected')
    first=sql(f"SELECT id FROM appointments WHERE barber_id='{barber}' AND appointment_time='10:00' AND status='scheduled' AND appointment_type='appointment';").stdout.splitlines()[0]
    assert sql(f"INSERT INTO appointment_services(appointment_id,service_id) VALUES ('{first}','{extra}');",False).returncode
    results.append('extra service extending into next appointment rejected and rolled back')
    assert sql(f"UPDATE services SET duration_minutes=45 WHERE id='{service}';",False).returncode
    results.append('catalogue edit creating overlap rejected')
    sql(f"UPDATE appointments SET booked_duration_minutes=1 WHERE id='{first}';")
    assert sql(f"SELECT booked_duration_minutes FROM appointments WHERE id='{first}';").stdout.strip()=='30'
    results.append('client cannot forge shorter duration')
    sql(f"UPDATE appointments SET status='cancelled' WHERE id='{first}';")
    sql(insert());results.append('cancelling releases the slot')
    # Two extras concurrently extend a booking into an adjacent booking only in combination.
    b2=str(uuid.uuid4());a2=sql(insert('14:00','2030-01-02',b2)).stdout.splitlines()[0]
    sql(insert('15:00','2030-01-02',b2))
    extra_insert=f"INSERT INTO appointment_services(appointment_id,service_id) VALUES ('{a2}','{extra}');"
    p=subprocess.Popen(P,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    p.stdin.write("BEGIN;"+extra_insert+"SELECT 'FIRST_INSERTED'; SELECT pg_sleep(1.5); COMMIT;");p.stdin.close()
    while True:
     line=p.stdout.readline()
     if 'FIRST_INSERTED' in line:break
     if not line:raise RuntimeError(p.stderr.read())
    r=sql(extra_insert,False);assert r.returncode and 'appointments_no_overlap' in r.stderr,r
    p.wait();assert p.returncode==0,p.stderr.read()
    assert sql(f"SELECT booked_duration_minutes FROM appointments WHERE id='{a2}';").stdout.strip()=='60'
    results.append('simultaneous extras serialize: second overlapping extension rejected')
    print(json.dumps({'passed':len(results),'checks':results},indent=2))
finally:
    subprocess.run(['docker','rm','-f',container],check=True,capture_output=True)

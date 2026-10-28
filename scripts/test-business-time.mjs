import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await readFile(new URL('../src/lib/businessTime.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { businessNow, businessClock, businessSlots, timeMinutes } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

// A business opening at 09:45 offers 10:15 next, preserving its own slot cadence.
assert.deepEqual(businessSlots('09:45:00', '11:30:00', 45), ['09:45', '10:15', '10:45']);
// End exactly at closing is valid, while a service exceeding closing by a minute is not.
assert.deepEqual(businessSlots('09:00', '10:00', 60), ['09:00']);
assert.deepEqual(businessSlots('09:00', '10:00', 61), []);
assert.deepEqual(businessSlots('09:00', '10:00', 0), ['09:00', '09:30']);
assert.deepEqual(businessSlots('10:00', '09:00', 30), []);
assert.deepEqual(businessSlots('09:00', '10:00', -1), []);
assert.deepEqual(businessSlots('invalid', '10:00', 30), []);
assert.deepEqual(businessSlots('09:00', '10:00', 30, 0), []);
assert.equal(timeMinutes('09:45:00'), 585);
// UTC has changed date, but São Paulo has not. These results ignore the host timezone.
assert.deepEqual(businessNow(new Date('2026-10-28T01:30:00Z')), { date: '2026-10-27', time: '22:30', minutes: 1350 });
assert.deepEqual(businessNow(new Date('2026-10-28T03:00:00Z')), { date: '2026-10-28', time: '00:00', minutes: 0 });
assert.equal(businessClock('2026-10-28T01:30:00Z'), '22:30');
assert.equal(businessClock('invalid'), '—');
console.log('PASS business slot cadence, strict closing, invalid inputs and São Paulo midnight handling');

const dailySource = await readFile(new URL('../src/lib/agendaDailyQueue.ts', import.meta.url), 'utf8');
const dailyCode = await transform(dailySource, { loader: 'ts', format: 'esm' });
const { dailyAppointments } = await import(`data:text/javascript;base64,${Buffer.from(dailyCode.code).toString('base64')}`);
const appt = { id:'a', status:'scheduled', appointment_date:'2026-10-27', appointment_time:'11:30', appointment_type:'appointment' };
const rows=[appt,{...appt,id:'future',appointment_date:'2026-10-31'},{...appt,id:'queue2',appointment_type:'queue',created_at:'2026-10-27T13:00:00Z'},{...appt,id:'queue1',appointment_type:'queue',created_at:'2026-10-27T12:00:00Z'},{...appt,id:'cancelled',status:'cancelled'},{...appt,id:'earlier',appointment_time:'09:00'}];
assert.deepEqual(dailyAppointments(rows,'2026-10-27','queue').map(r=>r.id), ['queue1','queue2']);
assert.deepEqual(dailyAppointments(rows,'2026-10-27','appointments').map(r=>r.id), ['earlier','a']);
assert.deepEqual(dailyAppointments(rows,'2026-10-28','queue'), []);
assert.equal(rows[0].id,'a');
console.log('PASS queue separates walk-ins from appointments, excludes future/cancelled and preserves chronological order');

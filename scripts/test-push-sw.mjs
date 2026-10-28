import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const handlers = {};
const shown = [];
const navigations = [];
const scope = 'https://example.com/HappyCashAgenda/';
const self = {
 registration: { scope, showNotification: async (title, options) => shown.push({ title, ...options }) },
 addEventListener: (name, callback) => { handlers[name] = callback; },
};
const clients = {
 matchAll: async () => [{ url: `${scope}dtalhe`, navigate: async url => navigations.push(url), focus: async () => true }],
 openWindow: async url => navigations.push(url),
};
vm.runInNewContext(fs.readFileSync('public/push-sw.js', 'utf8'), { self, clients, URL });
async function push(payload) {
 let pending;
 handlers.push({ data: { json: () => payload }, waitUntil: promise => { pending = promise; } });
 await pending;
}
await push({ title: 'Agendamento confirmado', body: 'Cliente · 28/10/2026 às 10:00', url: `${scope}dtalhe/meus-agendamentos`, tag: 'agenda-test' });
assert.equal(shown[0].data.url, `${scope}dtalhe/meus-agendamentos`);
assert.equal(shown[0].icon, `${scope}icons/icon-192.png`);
assert.equal(shown[0].tag, 'agenda-test');
await push({ title: 'Evento', url: 'https://malicious.example/steal' });
assert.equal(shown[1].data.url, scope);
await push({ title: 'Evento', url: 'https://example.com/another-app/private' });
assert.equal(shown[2].data.url, scope);
let pending;
let closed = false;
handlers.notificationclick({ notification: { close: () => { closed = true; }, data: { url: shown[0].data.url } }, waitUntil: promise => { pending = promise; } });
await pending;
assert.equal(closed, true);
assert.deepEqual(navigations, [`${scope}dtalhe/meus-agendamentos`]);
console.log('PASS native push handler: scoped target, icons, tag, external URL guard and click navigation');

import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source = fs.readFileSync('src/hooks/useNativePush.ts', 'utf8').replace(/^import .*;\n/gm, '');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sequence = [];
const subscription = { endpoint: 'https://fcm.googleapis.com/example', unsubscribe: async () => { sequence.push('unsubscribe'); } };
const exports = {};
const context = {
 exports,
 navigator: { serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }) } },
 window: { PushManager: {} },
 notificationClient: { rpc: async (name, args) => { sequence.push({ name, args }); return { error: null }; } },
};
vm.runInNewContext(javascript.replace(/import\.meta\.env\.VITE_AGENDA_VAPID_PUBLIC_KEY/g, "'test'"), context);
await exports.removeNativePushForSession('professional-1', 'session-secret');
assert.equal(sequence[0].name, 'unregister_agenda_push');
assert.equal(sequence[0].args.p_barber_id, 'professional-1');
assert.equal(sequence[0].args.p_session_token, 'session-secret');
assert.equal(sequence[1], 'unsubscribe');
sequence.length = 0;
context.notificationClient.rpc = async () => { sequence.push('network-failed'); throw new Error('network'); };
await assert.rejects(() => exports.removeNativePushForSession('professional-1', 'session-secret'), /network/);
assert.deepEqual(sequence, ['network-failed', 'unsubscribe']);
console.log('PASS native signout: validated legacy credentials, unregister order and offline unsubscribe');

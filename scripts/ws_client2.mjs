import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:6789');
ws.on('open', () => console.log('open'));
ws.on('message', (m) => {
	console.log('MSG:', m.toString());
});
ws.on('error', (e) => console.error('ERR', e.message || e));
setTimeout(() => { console.log('timeout exit'); process.exit(0); }, 6000);

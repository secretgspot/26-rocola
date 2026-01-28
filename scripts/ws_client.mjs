import WebSocket from 'ws';
const port = process.env.WS_PORT || 6789;
const ws = new WebSocket(`ws://localhost:${port}`);
ws.on('open', () => console.log('connected'));
ws.on('message', (m) => console.log('message:', m.toString()));
ws.on('close', () => console.log('closed'));
ws.on('error', (e) => console.error('error', e.message || e));

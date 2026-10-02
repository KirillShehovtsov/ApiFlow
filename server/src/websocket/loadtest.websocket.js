import jwt from 'jsonwebtoken';
import { onLoadTestUpdate } from '../services/loadtest.hub.js';
import { onTestScriptUpdate } from '../services/testscript.hub.js';

const parseToken = (req) => {
  const url = new URL(req.url || '', 'http://localhost');
  return url.searchParams.get('token');
};

export const isLoadTestWsRequest = (req) => {
  const url = new URL(req.url || '', 'http://localhost');
  return url.pathname === '/ws/load-tests';
};

export const authenticateWsRequest = (req) => {
  const token = parseToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

export const attachLoadTestWebSocket = (wss) => {
  const loadTestSubscriptions = new Map(); // ws -> Set(jobId)
  const testScriptSubscriptions = new Map(); // ws -> Set(scriptId)

  const unsubscribeHub = onLoadTestUpdate(({ userId, jobId, payload }) => {
    for (const client of wss.clients) {
      if (client.readyState !== client.OPEN) continue;
      if (client.userId !== userId) continue;
      const wantedJobs = loadTestSubscriptions.get(client);
      if (!wantedJobs || !wantedJobs.has(String(jobId))) continue;
      client.send(JSON.stringify({ type: 'load-test:update', jobId: String(jobId), payload }));
    }
  });
  const unsubscribeTestScriptHub = onTestScriptUpdate(({ userId, scriptId, payload }) => {
    for (const client of wss.clients) {
      if (client.readyState !== client.OPEN) continue;
      if (client.userId !== userId) continue;
      const wantedScripts = testScriptSubscriptions.get(client);
      if (!wantedScripts || !wantedScripts.has(String(scriptId))) continue;
      client.send(JSON.stringify({ type: 'test-script:update', scriptId: String(scriptId), payload }));
    }
  });

  wss.on('connection', (ws) => {
    loadTestSubscriptions.set(ws, new Set());
    testScriptSubscriptions.set(ws, new Set());

    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'subscribe' && message.jobId) {
          loadTestSubscriptions.get(ws)?.add(String(message.jobId));
          ws.send(JSON.stringify({ type: 'subscribed', jobId: String(message.jobId) }));
        }
        if (message.type === 'subscribe:test-script' && message.scriptId) {
          testScriptSubscriptions.get(ws)?.add(String(message.scriptId));
          ws.send(JSON.stringify({ type: 'subscribed:test-script', scriptId: String(message.scriptId) }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      loadTestSubscriptions.delete(ws);
      testScriptSubscriptions.delete(ws);
    });
  });

  wss.on('close', () => {
    unsubscribeHub();
    unsubscribeTestScriptHub();
  });
};


import app from './app.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import {
  isLoadTestWsRequest,
  authenticateWsRequest,
  attachLoadTestWebSocket,
} from './src/websocket/loadtest.websocket.js';

const PORT = process.env.PORT || 3000;
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

attachLoadTestWebSocket(wss);

server.on('upgrade', (req, socket, head) => {
  if (!isLoadTestWsRequest(req)) {
    socket.destroy();
    return;
  }

  const user = authenticateWsRequest(req);
  if (!user?.id) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.userId = user.id;
    wss.emit('connection', ws, req);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
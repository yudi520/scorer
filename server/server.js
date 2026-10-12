const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const rooms = new Map();
const roomClients = new Map();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Scorer WebSocket Server');
});

const wss = new WebSocket.Server({ server });

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastToRoom(roomCode, message, excludeWs = null) {
  const clients = roomClients.get(roomCode);
  if (!clients) return;
  
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function saveRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const roomData = {
    code: roomCode,
    name: room.name,
    ownerOpenid: room.ownerOpenid,
    initialBalance: room.initialBalance,
    teaTotal: room.teaTotal,
    teaRecords: room.teaRecords,
    fundRecords: room.fundRecords,
    members: Array.from(room.members.values()),
    updateTime: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'data', `${roomCode}.json`), 
    JSON.stringify(roomData, null, 2)
  );
}

function loadRoom(roomCode) {
  try {
    const filePath = path.join(__dirname, 'data', `${roomCode}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const members = new Map();
      data.members.forEach(m => members.set(m.openid, m));
      data.members = members;
      rooms.set(roomCode, data);
      return data;
    }
  } catch (err) {
    console.error('Load room error:', err);
  }
  return null;
}

wss.on('connection', (ws) => {
  let currentRoomCode = null;
  let currentOpenid = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'createRoom': {
          const { name, initialBalance, openid, nickname, avatar } = data;
          let roomCode = generateCode();
          
          while (rooms.has(roomCode)) {
            roomCode = generateCode();
          }
          
          const members = new Map();
          members.set(openid, {
            openid,
            nickname,
            avatar: avatar || '',
            balance: initialBalance || 100,
            isOwner: true,
            joinTime: new Date().toISOString()
          });
          
          const room = {
            code: roomCode,
            name,
            ownerOpenid: openid,
            initialBalance: initialBalance || 100,
            teaTotal: 0,
            teaRecords: [],
            fundRecords: [],
            members
          };
          
          rooms.set(roomCode, room);
          roomClients.set(roomCode, new Set([ws]));
          currentRoomCode = roomCode;
          currentOpenid = openid;
          
          saveRoom(roomCode);
          
          ws.send(JSON.stringify({
            type: 'roomCreated',
            room: {
              code: roomCode,
              name: room.name,
              ownerOpenid: room.ownerOpenid,
              initialBalance: room.initialBalance,
              teaTotal: room.teaTotal,
              teaRecords: room.teaRecords,
              fundRecords: room.fundRecords,
              members: Array.from(room.members.values())
            }
          }));
          break;
        }
        
        case 'joinRoom': {
          const { code, openid, nickname, avatar } = data;
          
          let room = rooms.get(code);
          if (!room) {
            room = loadRoom(code);
          }
          
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
            return;
          }
          
          const existingMember = room.members.get(openid);
          if (existingMember) {
            if (!roomClients.has(code)) {
              roomClients.set(code, new Set());
            }
            roomClients.get(code).add(ws);
            currentRoomCode = code;
            currentOpenid = openid;
            
            ws.send(JSON.stringify({
              type: 'roomJoined',
              room: {
                code: room.code,
                name: room.name,
                ownerOpenid: room.ownerOpenid,
                initialBalance: room.initialBalance,
                teaTotal: room.teaTotal,
                teaRecords: room.teaRecords,
                fundRecords: room.fundRecords,
                members: Array.from(room.members.values())
              }
            }));
            return;
          }
          
          room.members.set(openid, {
            openid,
            nickname,
            avatar: avatar || '',
            balance: room.initialBalance,
            isOwner: false,
            joinTime: new Date().toISOString()
          });
          
          if (!roomClients.has(code)) {
            roomClients.set(code, new Set());
          }
          roomClients.get(code).add(ws);
          currentRoomCode = code;
          currentOpenid = openid;
          
          saveRoom(code);
          
          broadcastToRoom(code, {
            type: 'memberJoined',
            member: room.members.get(openid)
          }, ws);
          
          ws.send(JSON.stringify({
            type: 'roomJoined',
            room: {
              code: room.code,
              name: room.name,
              ownerOpenid: room.ownerOpenid,
              initialBalance: room.initialBalance,
              teaTotal: room.teaTotal,
              teaRecords: room.teaRecords,
              fundRecords: room.fundRecords,
              members: Array.from(room.members.values())
            }
          }));
          break;
        }
        
        case 'deposit':
        case 'withdraw': {
          const { roomCode, openid, amount, note } = data;
          const room = rooms.get(roomCode);
          
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
            return;
          }
          
          const member = room.members.get(openid);
          if (!member) {
            ws.send(JSON.stringify({ type: 'error', message: '成员不存在' }));
            return;
          }
          
          const amountNum = parseFloat(amount);
          if (data.type === 'withdraw' && member.balance < amountNum) {
            ws.send(JSON.stringify({ type: 'error', message: '余额不足' }));
            return;
          }
          
          const newBalance = data.type === 'deposit' 
            ? member.balance + amountNum 
            : member.balance - amountNum;
          
          member.balance = newBalance;
          
          const record = {
            openid,
            type: data.type,
            amount: amountNum,
            balance: newBalance,
            note: note || '',
            time: new Date().toISOString()
          };
          
          room.fundRecords.push(record);
          
          saveRoom(roomCode);
          
          broadcastToRoom(roomCode, {
            type: 'balanceUpdated',
            openid,
            balance: newBalance,
            record
          });
          break;
        }
        
        case 'addTea': {
          const { roomCode, name, amount, openid, nickname } = data;
          const room = rooms.get(roomCode);
          
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
            return;
          }
          
          const amountNum = parseFloat(amount);
          room.teaTotal = (room.teaTotal || 0) + amountNum;
          
          const record = {
            name,
            amount: amountNum,
            creatorOpenid: openid,
            creatorName: nickname,
            time: new Date().toISOString()
          };
          
          room.teaRecords.push(record);
          
          saveRoom(roomCode);
          
          broadcastToRoom(roomCode, {
            type: 'teaUpdated',
            teaTotal: room.teaTotal,
            record
          });
          break;
        }
        
        case 'removeMember': {
          const { roomCode, targetOpenid, openid } = data;
          const room = rooms.get(roomCode);
          
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
            return;
          }
          
          if (room.ownerOpenid !== openid) {
            ws.send(JSON.stringify({ type: 'error', message: '只有房主可以移除成员' }));
            return;
          }
          
          room.members.delete(targetOpenid);
          
          saveRoom(roomCode);
          
          broadcastToRoom(roomCode, {
            type: 'memberRemoved',
            openid: targetOpenid
          });
          break;
        }
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode) {
      const clients = roomClients.get(currentRoomCode);
      if (clients) {
        clients.delete(ws);
      }
      broadcastToRoom(currentRoomCode, {
        type: 'memberLeft',
        openid: currentOpenid
      });
    }
  });
});

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

server.listen(PORT, () => {
  console.log(`Scorer WebSocket server running on port ${PORT}`);
});

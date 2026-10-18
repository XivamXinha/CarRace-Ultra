import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  RoomState,
  PlayerState,
  Obstacle,
  ChatMessage,
  ClientMessage,
  ServerMessage,
  Team
} from './src/types/game.js';
import { CAR_SPECS } from './src/data/cars.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;
const TRACK_LENGTH = 2400; // 2400 meters single-way highway race

interface RoomData {
  state: RoomState;
  clients: Map<WebSocket, string>; // socket -> playerId
  lastTickTime: number;
  botInterval?: NodeJS.Timeout;
}

const rooms = new Map<string, RoomData>();

function generateObstacles(trackLength: number): Obstacle[] {
  const obstacles: Obstacle[] = [];
  let id = 1;
  // Place obstacles starting at 200m to 2200m every 80-120m
  for (let dist = 220; dist < trackLength - 180; dist += 90 + Math.random() * 60) {
    const rand = Math.random();
    const type: Obstacle['type'] = rand < 0.45 ? 'oil' : rand < 0.8 ? 'boost' : 'nitro_pickup';
    const laneOffset = (Math.random() * 1.3 - 0.65); // -0.65 to 0.65
    obstacles.push({
      id: id++,
      type,
      distance: Math.round(dist),
      laneOffset: Number(laneOffset.toFixed(2)),
      width: type === 'oil' ? 0.35 : 0.3
    });
  }
  return obstacles;
}

function getOrCreateRoom(roomId: string): RoomData {
  let room = rooms.get(roomId);
  if (!room) {
    const initialState: RoomState = {
      roomId,
      status: 'LOBBY',
      countdown: 3,
      players: {},
      obstacles: generateObstacles(TRACK_LENGTH),
      trackLength: TRACK_LENGTH,
      startTime: null,
      elapsedTime: 0,
      winnerTeam: null,
      winnerId: null,
      winnerName: null,
      chatMessages: [
        {
          id: 'welcome-msg',
          senderId: 'system',
          senderName: 'Race Control',
          team: 'red',
          text: `Welcome to Room ${roomId}! Pick your team, customize your car, and click Ready.`,
          timestamp: Date.now(),
          isRadio: false
        }
      ]
    };

    room = {
      state: initialState,
      clients: new Map(),
      lastTickTime: Date.now()
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(room: RoomData, message: ServerMessage) {
  const data = JSON.stringify(message);
  for (const client of room.clients.keys()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function createPlayer(id: string, name: string, team: Team, carSpecId: string, slot: 1 | 2, isBot = false): PlayerState {
  return {
    id,
    name: name || (team === 'red' ? 'Crimson Racer' : 'Cobalt Racer'),
    team,
    carSpecId: carSpecId || (team === 'red' ? 'phoenix-gt' : 'cobalt-vortex'),
    slot,
    ready: isBot ? true : false,
    isBot,
    distance: 0,
    laneOffset: slot === 1 ? -0.35 : 0.35,
    speed: 0,
    nitro: 100,
    nitroActive: false,
    drafting: false,
    spinTimer: 0,
    boostTimer: 0,
    finished: false,
    finishTime: null,
    topSpeed: 0
  };
}

// Main game physics tick (runs at ~35 Hz)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const dt = Math.min((now - room.lastTickTime) / 1000, 0.1);
    room.lastTickTime = now;

    if (room.state.status === 'RACING') {
      updateRacePhysics(room, dt, now);
      broadcastToRoom(room, {
        type: 'state_update',
        state: room.state
      });
    }
  }
}, 30);

function updateRacePhysics(room: RoomData, dt: number, now: number) {
  const state = room.state;
  if (!state.startTime) state.startTime = now;
  state.elapsedTime = now - state.startTime;

  const playerIds = Object.keys(state.players);
  if (playerIds.length === 0) return;

  const players = Object.values(state.players);

  // Check drafting between Car 1 & Car 2
  if (players.length >= 2) {
    const [p1, p2] = players;
    p1.drafting = false;
    p2.drafting = false;

    const distDelta = p1.distance - p2.distance;
    const laneDelta = Math.abs(p1.laneOffset - p2.laneOffset);

    // If p1 is ahead of p2 by 4m to 25m, p2 gets slipstream draft
    if (distDelta > 4 && distDelta < 26 && laneDelta < 0.28) {
      p2.drafting = true;
    } else if (distDelta < -4 && distDelta > -26 && laneDelta < 0.28) {
      p1.drafting = true;
    }

    // Car-to-Car side collision on the single road
    if (Math.abs(distDelta) < 6 && laneDelta < 0.32) {
      // Repel laterally
      const push = 0.6 * dt;
      if (p1.laneOffset < p2.laneOffset) {
        p1.laneOffset = Math.max(-0.85, p1.laneOffset - push);
        p2.laneOffset = Math.min(0.85, p2.laneOffset + push);
      } else {
        p1.laneOffset = Math.min(0.85, p1.laneOffset + push);
        p2.laneOffset = Math.max(-0.85, p2.laneOffset - push);
      }
      // Speed check on collision
      p1.speed = Math.max(30, p1.speed - 15 * dt);
      p2.speed = Math.max(30, p2.speed - 15 * dt);

      broadcastToRoom(room, {
        type: 'player_bump',
        x: (p1.laneOffset + p2.laneOffset) / 2,
        y: (p1.distance + p2.distance) / 2
      });
    }
  }

  // Update each player physics
  for (const player of players) {
    if (player.finished) continue;

    const spec = CAR_SPECS.find(c => c.id === player.carSpecId) || CAR_SPECS[0];

    // Spin timer (from oil slick)
    if (player.spinTimer > 0) {
      player.spinTimer -= dt;
      player.speed = Math.max(40, player.speed - 80 * dt);
    }

    // Boost timer (from speed pad)
    if (player.boostTimer > 0) {
      player.boostTimer -= dt;
    }

    // Check nitro burn
    if (player.nitroActive && player.nitro > 0) {
      player.nitro = Math.max(0, player.nitro - 22 * dt);
      if (player.nitro <= 0) {
        player.nitroActive = false;
      }
    } else {
      player.nitroActive = false;
      // Very slow natural nitro regen (1 per sec)
      player.nitro = Math.min(100, player.nitro + 1.2 * dt);
    }

    // AI bot behavior update
    if (player.isBot) {
      simulateBotDrive(player, room, dt);
    }

    // Calculate maximum speed
    let effectiveMaxSpeed = spec.topSpeed;
    if (player.nitroActive) effectiveMaxSpeed += spec.nitroPower * 0.45; // up to +40 km/h
    if (player.boostTimer > 0) effectiveMaxSpeed += 50;
    if (player.drafting) effectiveMaxSpeed += 22;

    // Distance update based on km/h: (km/h * 1000 / 3600) = m/s
    const metersPerSecond = (player.speed * 1000) / 3600;
    player.distance += metersPerSecond * dt;

    if (player.speed > player.topSpeed) {
      player.topSpeed = Math.round(player.speed);
    }

    // Obstacle hit checks
    for (const obs of state.obstacles) {
      if (Math.abs(player.distance - obs.distance) < 3.5) {
        if (Math.abs(player.laneOffset - obs.laneOffset) < obs.width + 0.12) {
          if (obs.type === 'oil' && player.spinTimer <= 0) {
            player.spinTimer = 1.2;
            player.laneOffset += (Math.random() > 0.5 ? 0.25 : -0.25);
            player.laneOffset = Math.max(-0.85, Math.min(0.85, player.laneOffset));
          } else if (obs.type === 'boost' && player.boostTimer <= 0) {
            player.boostTimer = 1.4;
            player.speed = Math.min(effectiveMaxSpeed + 35, player.speed + 60);
          } else if (obs.type === 'nitro_pickup') {
            player.nitro = Math.min(100, player.nitro + 35);
          }
        }
      }
    }

    // Check finish line
    if (player.distance >= state.trackLength && !player.finished) {
      player.distance = state.trackLength;
      player.finished = true;
      player.finishTime = state.elapsedTime;

      if (!state.winnerId) {
        state.winnerId = player.id;
        state.winnerTeam = player.team;
        state.winnerName = player.name;
      }
    }
  }

  // Check if race should finish
  const allFinished = players.every(p => p.finished);
  const oneFinishedLongAgo = state.winnerId && players.some(p => p.finished && (state.elapsedTime - (p.finishTime || 0)) > 8000);

  if (allFinished || oneFinishedLongAgo) {
    state.status = 'FINISHED';
    const sortedStandings = [...players].sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.distance - a.distance;
    });

    const winner = sortedStandings[0];
    broadcastToRoom(room, {
      type: 'race_finished',
      winnerId: winner.id,
      winnerTeam: winner.team,
      winnerName: winner.name,
      standings: sortedStandings
    });
  }
}

function simulateBotDrive(bot: PlayerState, room: RoomData, dt: number) {
  const spec = CAR_SPECS.find(c => c.id === bot.carSpecId) || CAR_SPECS[0];
  const maxSpd = spec.topSpeed;

  // Bot accelerates
  if (bot.speed < maxSpd) {
    bot.speed = Math.min(maxSpd, bot.speed + spec.accel * 0.9 * dt);
  }

  // Look ahead for obstacles
  const lookAhead = bot.distance + 40;
  const nearestObstacle = room.state.obstacles.find(
    o => o.distance > bot.distance && o.distance < lookAhead
  );

  let targetLane = bot.slot === 1 ? -0.35 : 0.35;

  if (nearestObstacle) {
    if (nearestObstacle.type === 'oil') {
      // Dodge away from oil
      targetLane = nearestObstacle.laneOffset > 0 ? -0.45 : 0.45;
    } else if (nearestObstacle.type === 'boost' || nearestObstacle.type === 'nitro_pickup') {
      // Steer toward boost
      targetLane = nearestObstacle.laneOffset;
    }
  }

  // Smooth steer
  const laneDiff = targetLane - bot.laneOffset;
  bot.laneOffset += Math.sign(laneDiff) * Math.min(Math.abs(laneDiff), 1.2 * dt);
  bot.laneOffset = Math.max(-0.85, Math.min(0.85, bot.laneOffset));

  // Bot uses nitro when trailing or straight stretch
  const opponent = Object.values(room.state.players).find(p => p.id !== bot.id);
  if (opponent && opponent.distance > bot.distance && bot.nitro > 40 && !bot.nitroActive) {
    bot.nitroActive = true;
  }
}

function startCountdown(room: RoomData) {
  room.state.status = 'COUNTDOWN';
  room.state.countdown = 3;
  room.state.winnerId = null;
  room.state.winnerTeam = null;
  room.state.winnerName = null;
  room.state.startTime = null;
  room.state.elapsedTime = 0;

  broadcastToRoom(room, {
    type: 'countdown_tick',
    countdown: 3
  });

  let count = 3;
  const timer = setInterval(() => {
    count--;
    room.state.countdown = count;
    if (count > 0) {
      broadcastToRoom(room, {
        type: 'countdown_tick',
        countdown: count
      });
    } else if (count === 0) {
      broadcastToRoom(room, {
        type: 'countdown_tick',
        countdown: 0
      });
      room.state.status = 'RACING';
      room.state.startTime = Date.now();
      broadcastToRoom(room, {
        type: 'race_started'
      });
      clearInterval(timer);
    }
  }, 1000);
}

wss.on('connection', (ws) => {
  let currentRoomId: string | null = null;
  let currentPlayerId: string | null = null;

  ws.on('message', (rawData) => {
    try {
      const msg: ClientMessage = JSON.parse(rawData.toString());

      if (msg.type === 'join_room') {
        currentRoomId = msg.roomId.toUpperCase().trim() || 'MAIN';
        const room = getOrCreateRoom(currentRoomId);

        currentPlayerId = 'user_' + Math.random().toString(36).substring(2, 9);
        room.clients.set(ws, currentPlayerId);

        // Assign team and slot
        const existingPlayers = Object.values(room.state.players);
        let chosenTeam: Team = msg.team || 'red';
        let slot: 1 | 2 = 1;

        if (existingPlayers.length > 0) {
          const first = existingPlayers[0];
          // If first player is red, assign blue, or respect preference if available
          if (first.slot === 1) {
            slot = 2;
            chosenTeam = first.team === 'red' ? 'blue' : 'red';
          }
        }

        const player = createPlayer(currentPlayerId, msg.playerName, chosenTeam, msg.carSpecId, slot, false);
        room.state.players[currentPlayerId] = player;

        // Send init
        ws.send(JSON.stringify({
          type: 'init',
          state: room.state,
          yourId: currentPlayerId
        } as ServerMessage));

        // Broadcast updated state to room
        broadcastToRoom(room, {
          type: 'state_update',
          state: room.state
        });
      }

      if (!currentRoomId || !currentPlayerId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const player = room.state.players[currentPlayerId];
      if (!player) return;

      if (msg.type === 'switch_team') {
        player.team = msg.team;
        // switch slot if needed to match track side
        player.laneOffset = msg.team === 'red' ? -0.35 : 0.35;
        broadcastToRoom(room, {
          type: 'state_update',
          state: room.state
        });
      }

      if (msg.type === 'select_car') {
        player.carSpecId = msg.carSpecId;
        broadcastToRoom(room, {
          type: 'state_update',
          state: room.state
        });
      }

      if (msg.type === 'toggle_ready') {
        player.ready = !player.ready;
        broadcastToRoom(room, {
          type: 'state_update',
          state: room.state
        });

        // If at least 2 players in room and all ready, start countdown
        const allPlayers = Object.values(room.state.players);
        if (allPlayers.length >= 2 && allPlayers.every(p => p.ready) && room.state.status === 'LOBBY') {
          startCountdown(room);
        }
      }

      if (msg.type === 'add_bot') {
        // Add AI bot to the opposing team
        const botTeam: Team = player.team === 'red' ? 'blue' : 'red';
        const botCar = botTeam === 'red' ? 'phoenix-gt' : 'cobalt-vortex';
        const botId = 'bot_' + Math.random().toString(36).substring(2, 6);
        const botPlayer = createPlayer(
          botId,
          botTeam === 'red' ? 'AI Red Ghost' : 'AI Cobalt Ace',
          botTeam,
          botCar,
          player.slot === 1 ? 2 : 1,
          true
        );
        room.state.players[botId] = botPlayer;

        broadcastToRoom(room, {
          type: 'state_update',
          state: room.state
        });
      }

      if (msg.type === 'remove_bot') {
        for (const [id, p] of Object.entries(room.state.players)) {
          if (p.isBot) {
            delete room.state.players[id];
          }
        }
        broadcastToRoom(room, {
          type: 'state_update',
          state: room.state
        });
      }

      if (msg.type === 'player_input' && room.state.status === 'RACING' && !player.finished) {
        const input = msg.input;
        const spec = CAR_SPECS.find(c => c.id === player.carSpecId) || CAR_SPECS[0];

        // Acceleration & braking
        if (input.throttle) {
          player.speed = Math.min(
            player.nitroActive ? spec.topSpeed + 45 : spec.topSpeed,
            player.speed + spec.accel * (player.nitroActive ? 1.6 : 1.0) * 0.05
          );
        } else if (input.brake) {
          player.speed = Math.max(0, player.speed - 90 * 0.05);
        } else {
          // Natural engine braking / drag
          player.speed = Math.max(0, player.speed - 12 * 0.05);
        }

        // Steering
        if (input.steer !== 0 && player.speed > 5) {
          const steerRate = (spec.handling / 100) * 1.5 * 0.05;
          player.laneOffset += input.steer * steerRate;
          // Guardrail limits
          player.laneOffset = Math.max(-0.82, Math.min(0.82, player.laneOffset));
        }

        // Nitro toggle
        if (input.nitro && player.nitro > 10) {
          player.nitroActive = true;
        } else if (!input.nitro) {
          player.nitroActive = false;
        }
      }

      if (msg.type === 'send_chat') {
        const chatMsg: ChatMessage = {
          id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          senderId: player.id,
          senderName: player.name,
          team: player.team,
          text: msg.text.slice(0, 120),
          timestamp: Date.now(),
          isRadio: !!msg.isRadio
        };

        room.state.chatMessages.push(chatMsg);
        if (room.state.chatMessages.length > 50) {
          room.state.chatMessages.shift();
        }

        // Set radio message for in-game vehicle overhead bubble
        if (msg.isRadio) {
          player.lastRadioMessage = {
            text: msg.text,
            timestamp: Date.now()
          };
        }

        broadcastToRoom(room, {
          type: 'chat_message',
          message: chatMsg
        });
      }

      if (msg.type === 'restart_race') {
        // Reset race positions and obstacles
        room.state.status = 'LOBBY';
        room.state.winnerId = null;
        room.state.winnerTeam = null;
        room.state.winnerName = null;
        room.state.startTime = null;
        room.state.elapsedTime = 0;
        room.state.obstacles = generateObstacles(TRACK_LENGTH);

        for (const p of Object.values(room.state.players)) {
          p.distance = 0;
          p.speed = 0;
          p.nitro = 100;
          p.nitroActive = false;
          p.drafting = false;
          p.spinTimer = 0;
          p.boostTimer = 0;
          p.finished = false;
          p.finishTime = null;
          p.topSpeed = 0;
          p.ready = p.isBot ? true : false;
          p.laneOffset = p.slot === 1 ? -0.35 : 0.35;
        }

        broadcastToRoom(room, {
          type: 'state_update',
          state: room.state
        });
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          clientTime: msg.clientTime,
          serverTime: Date.now()
        } as ServerMessage));
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.clients.delete(ws);
        delete room.state.players[currentPlayerId];

        if (room.clients.size === 0) {
          // If all humans left, clean up
          rooms.delete(currentRoomId);
        } else {
          broadcastToRoom(room, {
            type: 'state_update',
            state: room.state
          });
        }
      }
    }
  });
});

// Configure Vite or Static Serve
async function setupServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Velocity Dual server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

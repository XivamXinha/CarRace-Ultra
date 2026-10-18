import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RoomState,
  PlayerState,
  ClientMessage,
  ServerMessage,
  Team,
  PlayerInput
} from './types/game';
import { RaceCanvas } from './components/RaceCanvas';
import { RaceHUD } from './components/RaceHUD';
import { RaceChat } from './components/RaceChat';
import { LobbyView } from './components/LobbyView';
import { PodiumModal } from './components/PodiumModal';
import { sounds } from './utils/audio';
import { Volume2, VolumeX, Radio, Trophy, ArrowLeft } from 'lucide-react';

export default function App() {
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'SPEEDWAY';
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('velocity_player_name');
      if (saved) return saved;
    } catch {
      // ignore
    }
    const racerNum = Math.floor(Math.random() * 899 + 100);
    return `Driver-${racerNum}`;
  });

  const [connected, setConnected] = useState(false);
  const [yourId, setYourId] = useState<string>('');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [isChatOpen, setIsChatOpen] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const inputStateRef = useRef<PlayerInput>({
    steer: 0,
    throttle: false,
    brake: false,
    nitro: false
  });
  const inputIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Send message helper
  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnected(true);
        // Join room immediately
        ws.send(JSON.stringify({
          type: 'join_room',
          roomId,
          playerName,
          team: 'red',
          carSpecId: 'phoenix-gt'
        } as ClientMessage));
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg: ServerMessage = JSON.parse(event.data);

          if (msg.type === 'init') {
            setYourId(msg.yourId);
            setRoomState(msg.state);
          } else if (msg.type === 'state_update') {
            setRoomState(msg.state);
          } else if (msg.type === 'chat_message') {
            setRoomState((prev) => {
              if (!prev) return prev;
              const exists = prev.chatMessages.some(m => m.id === msg.message.id);
              if (exists) return prev;
              return {
                ...prev,
                chatMessages: [...prev.chatMessages, msg.message]
              };
            });
          } else if (msg.type === 'countdown_tick') {
            setRoomState((prev) => prev ? { ...prev, countdown: msg.countdown } : prev);
          } else if (msg.type === 'race_started') {
            setRoomState((prev) => prev ? { ...prev, status: 'RACING' } : prev);
          } else if (msg.type === 'player_bump') {
            sounds.playCollision();
          } else if (msg.type === 'race_finished') {
            setRoomState((prev) => prev ? {
              ...prev,
              status: 'FINISHED',
              winnerId: msg.winnerId,
              winnerTeam: msg.winnerTeam,
              winnerName: msg.winnerName
            } : prev);
          }
        } catch (e) {
          console.error('Error handling server message:', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        // Try auto-reconnect
        reconnectTimeout = setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, playerName]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      let changed = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (!inputStateRef.current.throttle) {
          inputStateRef.current.throttle = true;
          changed = true;
        }
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (!inputStateRef.current.brake) {
          inputStateRef.current.brake = true;
          changed = true;
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (inputStateRef.current.steer !== -1) {
          inputStateRef.current.steer = -1;
          changed = true;
        }
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (inputStateRef.current.steer !== 1) {
          inputStateRef.current.steer = 1;
          changed = true;
        }
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (!inputStateRef.current.nitro) {
          inputStateRef.current.nitro = true;
          sounds.playNitroWhoosh();
          changed = true;
        }
      }

      if (changed) {
        sendMessage({
          type: 'player_input',
          input: { ...inputStateRef.current }
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      let changed = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        inputStateRef.current.throttle = false;
        changed = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputStateRef.current.brake = false;
        changed = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (inputStateRef.current.steer === -1) {
          inputStateRef.current.steer = 0;
          changed = true;
        }
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (inputStateRef.current.steer === 1) {
          inputStateRef.current.steer = 0;
          changed = true;
        }
      }
      if (e.key === ' ' || e.code === 'Space') {
        inputStateRef.current.nitro = false;
        changed = true;
      }

      if (changed) {
        sendMessage({
          type: 'player_input',
          input: { ...inputStateRef.current }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sendMessage]);

  // Periodic input broadcast to maintain continuous driving input during race
  useEffect(() => {
    if (roomState?.status === 'RACING') {
      inputIntervalRef.current = setInterval(() => {
        sendMessage({
          type: 'player_input',
          input: { ...inputStateRef.current }
        });
      }, 50);
    } else {
      if (inputIntervalRef.current) {
        clearInterval(inputIntervalRef.current);
      }
    }
    return () => {
      if (inputIntervalRef.current) {
        clearInterval(inputIntervalRef.current);
      }
    };
  }, [roomState?.status, sendMessage]);

  const handleTouchInput = (key: 'steerLeft' | 'steerRight' | 'throttle' | 'brake' | 'nitro', active: boolean) => {
    if (key === 'steerLeft') {
      inputStateRef.current.steer = active ? -1 : 0;
    } else if (key === 'steerRight') {
      inputStateRef.current.steer = active ? 1 : 0;
    } else if (key === 'throttle') {
      inputStateRef.current.throttle = active;
    } else if (key === 'brake') {
      inputStateRef.current.brake = active;
    } else if (key === 'nitro') {
      inputStateRef.current.nitro = active;
      if (active) sounds.playNitroWhoosh();
    }

    sendMessage({
      type: 'player_input',
      input: { ...inputStateRef.current }
    });
  };

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  const handleToggleReady = () => {
    sendMessage({ type: 'toggle_ready' });
  };

  const handleSwitchTeam = (team: Team) => {
    sendMessage({ type: 'switch_team', team });
  };

  const handleSelectCar = (carSpecId: string) => {
    sendMessage({ type: 'select_car', carSpecId });
  };

  const handleAddBot = () => {
    sendMessage({ type: 'add_bot' });
  };

  const handleRemoveBot = () => {
    sendMessage({ type: 'remove_bot' });
  };

  const handleSendChat = (text: string, isRadio: boolean) => {
    sendMessage({ type: 'send_chat', text, isRadio });
  };

  const handleRestartRace = () => {
    sendMessage({ type: 'restart_race' });
  };

  const localPlayer = roomState?.players[yourId];

  // Loading/Connecting View
  if (!connected || !roomState) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-100">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-black uppercase tracking-widest text-slate-300">
          Connecting to Velocity Duel Server...
        </div>
        <div className="text-xs text-slate-500 font-mono">Room: {roomId}</div>
      </div>
    );
  }

  // Lobby Paddock Staging View
  if (roomState.status === 'LOBBY') {
    return (
      <LobbyView
        roomId={roomState.roomId}
        localPlayer={localPlayer}
        players={roomState.players}
        chatMessages={roomState.chatMessages}
        onToggleReady={handleToggleReady}
        onSwitchTeam={handleSwitchTeam}
        onSelectCar={handleSelectCar}
        onAddBot={handleAddBot}
        onRemoveBot={handleRemoveBot}
        onSendChat={handleSendChat}
      />
    );
  }

  // Active Race or Finished View
  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden flex flex-col">
      {/* 2D High-Speed Racetrack Canvas */}
      <RaceCanvas
        players={roomState.players}
        obstacles={roomState.obstacles}
        trackLength={roomState.trackLength}
        localPlayerId={yourId}
        countdown={roomState.countdown}
        status={roomState.status}
      />

      {/* Heads-Up Display (Speedometer, Minimap, Nitro, Gap) */}
      <RaceHUD
        localPlayer={localPlayer}
        players={roomState.players}
        trackLength={roomState.trackLength}
        elapsedTime={roomState.elapsedTime}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onInputPress={handleTouchInput}
      />

      {/* Floating In-Race Chat & Radio Overlay */}
      <div className="absolute top-20 right-4 z-20 w-80 max-w-[calc(100vw-2rem)]">
        <RaceChat
          messages={roomState.chatMessages}
          currentTeam={localPlayer?.team || 'red'}
          playerName={localPlayer?.name || 'Racer'}
          onSendMessage={handleSendChat}
        />
      </div>

      {/* Post-Race Podium Modal */}
      {roomState.status === 'FINISHED' && (
        <PodiumModal
          winnerId={roomState.winnerId}
          winnerTeam={roomState.winnerTeam}
          winnerName={roomState.winnerName}
          players={roomState.players}
          onRestart={handleRestartRace}
          onSendChat={handleSendChat}
        />
      )}
    </div>
  );
}

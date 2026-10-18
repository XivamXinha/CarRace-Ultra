export type Team = 'red' | 'blue';

export type RaceStatus = 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'FINISHED';

export interface CarSpec {
  id: string;
  name: string;
  team: Team;
  topSpeed: number; // max km/h e.g. 260
  accel: number;    // acceleration rate
  handling: number; // steer response
  nitroPower: number; // nitro speed boost
  primaryColor: string;
  accentColor: string;
  description: string;
}

export interface PlayerInput {
  steer: number;   // -1 (left) to 1 (right)
  throttle: boolean;
  brake: boolean;
  nitro: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  carSpecId: string;
  slot: 1 | 2;
  ready: boolean;
  isBot?: boolean;
  distance: number;       // 0 to trackLength (in meters)
  laneOffset: number;     // -1 (far left) to 1 (far right), 0 is center
  speed: number;          // km/h (0 to 300)
  nitro: number;          // 0 to 100
  nitroActive: boolean;
  drafting: boolean;      // slipstream draft behind opponent
  spinTimer: number;      // penalty when hitting oil
  boostTimer: number;     // surge when hitting boost pad
  finished: boolean;
  finishTime: number | null; // ms from race start
  topSpeed: number;
  lastRadioMessage?: {
    text: string;
    timestamp: number;
  };
}

export interface Obstacle {
  id: number;
  type: 'oil' | 'boost' | 'nitro_pickup';
  distance: number;       // meters along track
  laneOffset: number;     // -0.7 to 0.7
  width: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  team: Team;
  text: string;
  timestamp: number;
  isRadio: boolean;
}

export interface RoomState {
  roomId: string;
  status: RaceStatus;
  countdown: number;
  players: Record<string, PlayerState>;
  obstacles: Obstacle[];
  trackLength: number;
  startTime: number | null;
  elapsedTime: number;
  winnerTeam: Team | null;
  winnerId: string | null;
  winnerName: string | null;
  chatMessages: ChatMessage[];
}

export type ClientMessage =
  | { type: 'join_room'; roomId: string; playerName: string; team: Team; carSpecId: string }
  | { type: 'toggle_ready' }
  | { type: 'switch_team'; team: Team }
  | { type: 'select_car'; carSpecId: string }
  | { type: 'add_bot'; team?: Team }
  | { type: 'remove_bot' }
  | { type: 'player_input'; input: PlayerInput }
  | { type: 'send_chat'; text: string; isRadio?: boolean }
  | { type: 'restart_race' }
  | { type: 'ping'; clientTime: number };

export type ServerMessage =
  | { type: 'init'; state: RoomState; yourId: string }
  | { type: 'state_update'; state: RoomState }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'countdown_tick'; countdown: number }
  | { type: 'race_started' }
  | { type: 'race_finished'; winnerId: string; winnerTeam: Team; winnerName: string; standings: PlayerState[] }
  | { type: 'player_bump'; x: number; y: number }
  | { type: 'pong'; clientTime: number; serverTime: number }
  | { type: 'error'; message: string };

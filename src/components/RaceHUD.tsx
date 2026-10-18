import React from 'react';
import { PlayerState, Team } from '../types/game';
import { sounds } from '../utils/audio';
import { Volume2, VolumeX, Zap, Flag, Gauge, ArrowLeft, ArrowRight } from 'lucide-react';

interface RaceHUDProps {
  localPlayer: PlayerState | undefined;
  players: Record<string, PlayerState>;
  trackLength: number;
  elapsedTime: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onInputPress: (key: 'steerLeft' | 'steerRight' | 'throttle' | 'brake' | 'nitro', active: boolean) => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  localPlayer,
  players,
  trackLength,
  elapsedTime,
  isMuted,
  onToggleMute,
  onInputPress
}) => {
  if (!localPlayer) return null;

  const allPlayers = Object.values(players);
  // Calculate position (1st or 2nd)
  const opponent = allPlayers.find(p => p.id !== localPlayer.id);

  let position = 1;
  let gapMeters = 0;
  if (opponent) {
    if (opponent.distance > localPlayer.distance) {
      position = 2;
      gapMeters = Math.round(opponent.distance - localPlayer.distance);
    } else {
      position = 1;
      gapMeters = Math.round(localPlayer.distance - opponent.distance);
    }
  }

  // Format elapsed time (mm:ss.SS)
  const totalSeconds = elapsedTime / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds % 1) * 100);
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;

  const currentSpeed = Math.round(localPlayer.speed);
  const nitroPercent = Math.round(localPlayer.nitro);
  const distanceRemaining = Math.max(0, Math.round(trackLength - localPlayer.distance));

  // Determine gear roughly from speed
  const gear = currentSpeed === 0 ? 'N' : currentSpeed < 50 ? '1' : currentSpeed < 100 ? '2' : currentSpeed < 160 ? '3' : currentSpeed < 210 ? '4' : currentSpeed < 255 ? '5' : '6';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 md:p-5 select-none z-10">
      {/* Top Bar: Progress Track Minimap & Race Metrics */}
      <div className="flex flex-col gap-2 w-full max-w-4xl mx-auto">
        {/* Track Minimap Bar */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-200">START</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 font-mono">2-Car Highway Way</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-amber-400">{timeFormatted}</span>
              <button
                onClick={onToggleMute}
                aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Dual Car Track Slider */}
          <div className="relative h-4 bg-slate-950 rounded-full overflow-visible border border-slate-800 flex items-center px-1">
            {/* Checkered flag at end */}
            <div className="absolute right-1 text-xs">🏁</div>

            {/* Car Markers */}
            {allPlayers.map((p) => {
              const progressPct = Math.min(Math.max((p.distance / trackLength) * 100, 2), 98);
              const isLocal = p.id === localPlayer.id;
              const color = p.team === 'red' ? '#ef4444' : '#3b82f6';

              return (
                <div
                  key={p.id}
                  className="absolute -top-1.5 transform -translate-x-1/2 transition-all duration-75 flex flex-col items-center"
                  style={{ left: `${progressPct}%` }}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${isLocal ? 'border-white ring-2 ring-sky-400 shadow-lg' : 'border-slate-800'}`}
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[9px] font-bold text-slate-300 mt-0.5 tracking-tighter whitespace-nowrap">
                    {isLocal ? 'YOU' : p.name.slice(0, 6)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tactical Status Alerts: Drafting / Spin / Boost */}
        <div className="flex items-center justify-center gap-2">
          {localPlayer.drafting && (
            <div className="bg-sky-500/20 text-sky-300 border border-sky-500/40 px-3 py-1 rounded-md text-xs font-bold tracking-wide animate-pulse">
              ⚡ SLIPSTREAM DRAFTING (+22 km/h)
            </div>
          )}
          {localPlayer.boostTimer > 0 && (
            <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-md text-xs font-bold tracking-wide animate-bounce">
              🔥 SUPERCHARGED BOOST!
            </div>
          )}
          {localPlayer.spinTimer > 0 && (
            <div className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-md text-xs font-bold tracking-wide">
              ⚠️ OIL SLICK SLIP!
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area: Gauges + Touch Controls */}
      <div className="w-full max-w-4xl mx-auto flex items-end justify-between gap-4">
        {/* Left: Position & Distance to Finish */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 shadow-xl flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${position === 1 ? 'text-amber-400' : 'text-slate-300'}`}>
              {position === 1 ? '1ST' : '2ND'}
            </span>
            <span className="text-xs font-medium text-slate-400">POSITION</span>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span>GAP:</span>
            {opponent ? (
              <span className={position === 1 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {position === 1 ? `+${gapMeters}m AHEAD` : `-${gapMeters}m BEHIND`}
              </span>
            ) : (
              <span className="text-slate-500">Solo Pacesetter</span>
            )}
          </div>

          <div className="text-xs font-mono text-slate-400">
            FINISH: <span className="text-slate-200 font-bold">{distanceRemaining}m</span>
          </div>
        </div>

        {/* Center Mobile Touch Controls (shown on touch/small screens) */}
        <div className="pointer-events-auto flex lg:hidden items-center gap-2">
          <div className="flex gap-2">
            <button
              onPointerDown={() => onInputPress('steerLeft', true)}
              onPointerUp={() => onInputPress('steerLeft', false)}
              onPointerLeave={() => onInputPress('steerLeft', false)}
              className="w-12 h-12 bg-slate-800/90 active:bg-sky-600 border border-slate-700 rounded-xl flex items-center justify-center text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => onInputPress('steerRight', true)}
              onPointerUp={() => onInputPress('steerRight', false)}
              onPointerLeave={() => onInputPress('steerRight', false)}
              className="w-12 h-12 bg-slate-800/90 active:bg-sky-600 border border-slate-700 rounded-xl flex items-center justify-center text-white"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onPointerDown={() => onInputPress('throttle', true)}
              onPointerUp={() => onInputPress('throttle', false)}
              onPointerLeave={() => onInputPress('throttle', false)}
              className="w-12 h-12 bg-emerald-600/90 active:bg-emerald-500 border border-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xs"
            >
              GAS
            </button>
            <button
              onPointerDown={() => onInputPress('nitro', true)}
              onPointerUp={() => onInputPress('nitro', false)}
              onPointerLeave={() => onInputPress('nitro', false)}
              className="w-12 h-12 bg-cyan-600/90 active:bg-cyan-500 border border-cyan-400 rounded-xl flex items-center justify-center text-white font-black text-xs"
            >
              N₂O
            </button>
          </div>
        </div>

        {/* Right: Speedometer & Nitro Thruster */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 shadow-xl flex flex-col gap-2 min-w-[170px]">
          {/* Speed Digital Readout */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-4xl font-black text-white tabular-nums tracking-tight">
                {currentSpeed}
              </span>
              <span className="text-xs font-bold text-slate-400">KM/H</span>
            </div>
            <div className="text-xs font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-amber-400">
              GEAR {gear}
            </div>
          </div>

          {/* Nitro Gauge */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <div className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>NITRO [SPACE]</span>
              </div>
              <span className="font-mono text-cyan-300 tabular-nums">{nitroPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-100 ${
                  localPlayer.nitroActive
                    ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
                style={{ width: `${nitroPercent}%` }}
              />
            </div>
          </div>

          {/* Controls hint */}
          <div className="hidden md:flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>[W/↑] ACCEL</span>
            <span>[A/D/←→] STEER</span>
            <span>[S/↓] BRAKE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

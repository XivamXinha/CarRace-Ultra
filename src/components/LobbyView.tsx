import React, { useState } from 'react';
import { PlayerState, Team } from '../types/game';
import { CAR_SPECS } from '../data/cars';
import { RaceChat } from './RaceChat';
import { ChatMessage } from '../types/game';
import { Shield, Zap, Users, Copy, Check, Bot, Gauge, Compass, Flag } from 'lucide-react';

interface LobbyViewProps {
  roomId: string;
  localPlayer: PlayerState | undefined;
  players: Record<string, PlayerState>;
  chatMessages: ChatMessage[];
  onToggleReady: () => void;
  onSwitchTeam: (team: Team) => void;
  onSelectCar: (carSpecId: string) => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onSendChat: (text: string, isRadio: boolean) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomId,
  localPlayer,
  players,
  chatMessages,
  onToggleReady,
  onSwitchTeam,
  onSelectCar,
  onAddBot,
  onRemoveBot,
  onSendChat
}) => {
  const [copied, setCopied] = useState(false);

  const allPlayers = Object.values(players);
  const opponent = allPlayers.find(p => p.id !== localPlayer?.id);
  const currentTeam = localPlayer?.team || 'red';
  const selectedCar = CAR_SPECS.find(c => c.id === localPlayer?.carSpecId) || CAR_SPECS[0];

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const teamSpecs = CAR_SPECS.filter(c => c.team === currentTeam);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar Contract: Brand - Nav Links - Primary Action */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <div className="text-xl font-black tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2">
          <span className="text-rose-500">VELOCITY</span>
          <span className="text-slate-400">/</span>
          <span className="text-sky-400">DUAL</span>
        </div>

        {/* Zone 2: Concise text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <span className="text-slate-200">Highway Duel</span>
          <span>·</span>
          <span>Drafting Physics</span>
          <span>·</span>
          <span>Live In-Race Radio</span>
          <span>·</span>
          <span>Two-Car Single Way</span>
        </nav>

        {/* Zone 3: Primary Action / Ready Status */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleReady}
            className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md whitespace-nowrap shrink-0 cursor-pointer ${
              localPlayer?.ready
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
            }`}
          >
            {localPlayer?.ready ? '✓ READY TO RACE' : 'READY UP NOW'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Paddock Setup, Teams, Cars */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Cinematic Hero Room Banner with Generated Racetrack Backdrop */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl min-h-[200px] flex items-center">
            {/* Background Image with Measured Scrim */}
            <img
              src="/src/assets/images/race_track_backdrop_1792325333789.jpg"
              alt="Two racing cars head-to-head on a highway"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />

            {/* Banner Content */}
            <div className="relative z-10 p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <div className="flex flex-col gap-1.5 max-w-xl">
                <div className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <span>HEAD-TO-HEAD HIGHWAY SPRINT</span>
                  <span className="font-mono text-white bg-slate-900/90 border border-slate-700 px-2.5 py-0.5 rounded text-sm font-bold">
                    ROOM {roomId}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight text-balance">
                  Dual-Car Highway Race
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Single-way 2400m drag sprint. Draft your opponent, steer around oil slicks, trigger nitro boosts, and transmit live radio calls to claim 1st place!
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
                </button>

                {!opponent && (
                  <button
                    onClick={onAddBot}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Race AI Bot</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team Selection Tabs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-tight">Choose Your Team & Track Side</h3>
              <span className="text-xs font-medium text-slate-400">Car 1 (Left) vs Car 2 (Right)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Team Crimson */}
              <button
                onClick={() => onSwitchTeam('red')}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  currentTeam === 'red'
                    ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Team Crimson Fury
                  </span>
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                </div>
                <div className="text-sm font-black text-white">Left Highway Lane (Car 1)</div>
                <div className="text-xs text-slate-400 mt-1">High-torque raw muscle & explosive nitro.</div>
              </button>

              {/* Team Cobalt */}
              <button
                onClick={() => onSwitchTeam('blue')}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  currentTeam === 'blue'
                    ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Team Cobalt Blitz
                  </span>
                  <span className="w-3 h-3 rounded-full bg-sky-500" />
                </div>
                <div className="text-sm font-black text-white">Right Highway Lane (Car 2)</div>
                <div className="text-xs text-slate-400 mt-1">Twin-turbo AWD & surgical aerodynamics.</div>
              </button>
            </div>
          </div>

          {/* Car Fleet Selection */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Supercar Garage Spec</h3>
                <p className="text-xs text-slate-400">Tuned specifications for {currentTeam === 'red' ? 'Team Crimson' : 'Team Cobalt'}</p>
              </div>
              <div className="w-32 h-14 rounded-lg overflow-hidden border border-slate-700/80 shrink-0 hidden sm:block">
                <img
                  src="/src/assets/images/race_cars_showcase_1792325333431.jpg"
                  alt="Supercars in garage"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teamSpecs.map((car) => {
                const isSelected = selectedCar.id === car.id;
                return (
                  <div
                    key={car.id}
                    onClick={() => onSelectCar(car.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3 ${
                      isSelected
                        ? currentTeam === 'red'
                          ? 'border-rose-500 bg-rose-500/10 shadow-md'
                          : 'border-sky-500 bg-sky-500/10 shadow-md'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: car.primaryColor }}
                        />
                        <span className="font-black text-sm text-white">{car.name}</span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {car.description}
                    </p>

                    {/* Spec stat meters */}
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Top Speed</span>
                        <span className="text-white font-bold">{car.topSpeed} km/h</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Acceleration</span>
                        <span className="text-white font-bold">{car.accel} / 100</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Handling</span>
                        <span className="text-white font-bold">{car.handling} / 100</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Nitro Boost</span>
                        <span className="text-white font-bold">+{Math.round(car.nitroPower * 0.45)} km/h</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Duel Matchup Staging (Car 1 vs Car 2) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-white tracking-tight">Starting Grid Duel Matchup</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Player Staging */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    You (Car {localPlayer?.slot})
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      localPlayer?.ready
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {localPlayer?.ready ? '✓ READY' : 'NOT READY'}
                  </span>
                </div>
                <div className="text-lg font-black text-white">{localPlayer?.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedCar.primaryColor }}
                  />
                  <span>{selectedCar.name}</span>
                  <span>·</span>
                  <span className="capitalize">{localPlayer?.team}</span>
                </div>
              </div>

              {/* Opponent Player Staging */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Opponent {opponent ? `(Car ${opponent.slot})` : ''}
                  </span>
                  {opponent && (
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        opponent.ready
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {opponent.ready ? '✓ READY' : 'NOT READY'}
                    </span>
                  )}
                </div>

                {opponent ? (
                  <>
                    <div className="text-lg font-black text-white flex items-center gap-2">
                      <span>{opponent.name}</span>
                      {opponent.isBot && (
                        <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">
                          AI BOT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              CAR_SPECS.find(c => c.id === opponent.carSpecId)?.primaryColor || '#3b82f6'
                          }}
                        />
                        <span>
                          {CAR_SPECS.find(c => c.id === opponent.carSpecId)?.name || 'Supercar'}
                        </span>
                      </div>
                      {opponent.isBot && (
                        <button
                          onClick={onRemoveBot}
                          className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                        >
                          Remove Bot
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-center gap-2">
                    <span className="text-xs text-slate-400 italic">
                      Waiting for second user to join room...
                    </span>
                    <button
                      onClick={onAddBot}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      Add AI Competitor Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Chat & Radio Communications */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Pre-Race Comms & Tactical Radio
          </div>
          <RaceChat
            messages={chatMessages}
            currentTeam={currentTeam}
            playerName={localPlayer?.name || 'Racer'}
            onSendMessage={onSendChat}
            className="flex-1 min-h-[440px]"
          />

          {/* Quick instructions */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400 flex flex-col gap-1.5">
            <span className="font-bold text-slate-200">How to Win:</span>
            <span>· Accelerate with W or Up Arrow; Brake with S or Down Arrow.</span>
            <span>· Steer with A/D or Left/Right; Fire Nitro with Spacebar.</span>
            <span>· Tuck behind your rival to trigger Slipstream Drafting boost!</span>
            <span>· Avoid oil slicks, hit yellow speed pads, and reach 2400m first!</span>
          </div>
        </div>
      </main>
    </div>
  );
};

import React, { useEffect } from 'react';
import { PlayerState, Team } from '../types/game';
import { CAR_SPECS } from '../data/cars';
import { sounds } from '../utils/audio';
import { Trophy, RotateCcw, Zap, Gauge, MessageSquare, Flag } from 'lucide-react';

interface PodiumModalProps {
  winnerId: string | null;
  winnerTeam: Team | null;
  winnerName: string | null;
  players: Record<string, PlayerState>;
  onRestart: () => void;
  onSendChat: (text: string, isRadio: boolean) => void;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  winnerId,
  winnerTeam,
  winnerName,
  players,
  onRestart,
  onSendChat
}) => {
  useEffect(() => {
    sounds.playFinishFanfare();
  }, []);

  const standings = Object.values(players).sort((a, b) => {
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.distance - a.distance;
  });

  const winner = standings[0];
  const isCrimson = winnerTeam === 'red';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col gap-6">
        {/* Glow backdrop based on winning team */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none ${
            isCrimson ? 'bg-red-500' : 'bg-blue-500'
          }`}
        />

        {/* Header / Trophy */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg mb-1">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Race Result · Single Highway Sprint
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            {winnerName || 'Winner'} Takes 1st!
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider ${
                isCrimson ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {isCrimson ? 'Team Crimson Fury' : 'Team Cobalt Blitz'}
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-slate-300">
              {winner?.finishTime ? `${(winner.finishTime / 1000).toFixed(2)}s` : '--'}
            </span>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 grid grid-cols-12 gap-2">
            <span className="col-span-2">Pos</span>
            <span className="col-span-5">Racer</span>
            <span className="col-span-3 text-right">Top Speed</span>
            <span className="col-span-2 text-right">Time</span>
          </div>

          <div className="divide-y divide-slate-800/60 font-sans">
            {standings.map((p, idx) => {
              const spec = CAR_SPECS.find(c => c.id === p.carSpecId);
              const isWinnerRow = idx === 0;

              return (
                <div
                  key={p.id}
                  className={`px-4 py-3 grid grid-cols-12 gap-2 items-center text-xs ${
                    isWinnerRow ? 'bg-slate-800/40 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  <div className="col-span-5 flex flex-col">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      {p.name}
                      {p.isBot && <span className="text-[9px] text-slate-500 font-mono">[AI]</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {spec?.name || 'Supercar'}
                    </span>
                  </div>

                  <div className="col-span-3 text-right font-mono text-slate-200">
                    {p.topSpeed || p.speed} <span className="text-[10px] text-slate-400">km/h</span>
                  </div>

                  <div className="col-span-2 text-right font-mono font-bold text-amber-400">
                    {p.finishTime ? `${(p.finishTime / 1000).toFixed(2)}s` : 'DNF'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Trash Talk / GG buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSendChat('🤝 Good race! Rematch?', true)}
            className="flex-1 py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Send "Good race!"
          </button>
          <button
            onClick={() => onSendChat('⚡ Next time I will smoke you!', true)}
            className="flex-1 py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Send "Rematch!"
          </button>
        </div>

        {/* Action Button: Restart / Rematch */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          START REMATCH
        </button>
      </div>
    </div>
  );
};

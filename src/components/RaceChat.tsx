import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Team } from '../types/game';
import { QUICK_RADIO_MESSAGES } from '../data/cars';
import { sounds } from '../utils/audio';
import { MessageSquare, Send, Radio, ChevronDown, ChevronUp } from 'lucide-react';

interface RaceChatProps {
  messages: ChatMessage[];
  currentTeam: Team;
  playerName: string;
  onSendMessage: (text: string, isRadio: boolean) => void;
  className?: string;
}

export const RaceChat: React.FC<RaceChatProps> = ({
  messages,
  currentTeam,
  playerName,
  onSendMessage,
  className = ''
}) => {
  const [inputText, setInputText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > lastMessageCountRef.current) {
      sounds.playRadioChime();
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, false);
    setInputText('');
  };

  const handleQuickRadio = (radioText: string) => {
    onSendMessage(radioText, true);
  };

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
        isCollapsed ? 'h-12' : 'h-[360px] md:h-[420px]'
      } ${className}`}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Race Radio & Chat
          </span>
          <span className="text-[10px] text-slate-500 font-mono">({messages.length})</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
          aria-label={isCollapsed ? 'Expand chat' : 'Collapse chat'}
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Quick Radio Buttons Strip (Crucial for high speed typing during driving) */}
          <div className="p-2 bg-slate-900/60 border-b border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
              Quick Radio Comms
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
              {QUICK_RADIO_MESSAGES.slice(0, 6).map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickRadio(msg)}
                  className="px-2 py-1 text-[11px] font-medium text-left bg-slate-800/80 hover:bg-slate-700 active:bg-sky-600/50 text-slate-200 hover:text-white rounded border border-slate-700/60 truncate transition-colors cursor-pointer"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Message History */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 font-sans text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic text-xs">
                No radio transmissions yet. Transmit something!
              </div>
            ) : (
              messages.map((m) => {
                const isSystem = m.senderId === 'system';
                const teamColor = isSystem
                  ? 'text-amber-400'
                  : m.team === 'red'
                  ? 'text-rose-400'
                  : 'text-sky-400';

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-0.5 rounded-lg p-2 ${
                      m.isRadio
                        ? 'bg-slate-800/60 border border-slate-700/50'
                        : 'bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${teamColor}`}>
                          {m.senderName}
                        </span>
                        {!isSystem && (
                          <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400">
                            {m.team}
                          </span>
                        )}
                        {m.isRadio && (
                          <span className="text-[9px] font-semibold text-emerald-400 uppercase">
                            [RADIO]
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 font-mono text-[9px]">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-200 break-words font-medium text-xs leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message your rival / team..."
              maxLength={120}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
// Clean subtle double-chime alert sound
const playTimerChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playBeep = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playBeep(880, now, 0.4);        // First chime (A5)
    playBeep(1174.66, now + 0.25, 0.6); // Second chime (D6 - sharp & pleasant)
  } catch (e) {
    console.error('Audio play failed', e);
  }
};
export default function ClockTimerWidget({ widget, currentTime, editMode, onChange }) {
  const {
    mode,
    format24h,
    font,
    color,
    glowSpread,
    fontSize,
    pomoMinutes,
    pomoSecondsLeft,
    pomoRunning,
    pomoState,
    pomoCycles,
    stopwatchMs,
    stopwatchRunning
  } = widget;
const prevRunningRef = React.useRef(pomoRunning);

  React.useEffect(() => {
    if (prevRunningRef.current && !pomoRunning && pomoSecondsLeft === 0) {
      playTimerChime();
    }
    prevRunningRef.current = pomoRunning;
  }, [pomoSecondsLeft, pomoRunning]);
  const textGlowStyle = {
    color: color || '#38bdf8',
    textShadow: glowSpread > 0 
      ? `0 0 ${glowSpread}px ${color}, 0 0 ${glowSpread * 2}px ${color}80` 
      : 'none'
  };

  const formatTime = () => {
    let hours = currentTime.getHours();
    const mins = String(currentTime.getMinutes()).padStart(2, '0');
    const secs = String(currentTime.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (!format24h) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }
    return {
      main: `${String(hours).padStart(2, '0')}:${mins}`,
      sub: `:${secs}${ampm}`,
      dateStr: currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    };
  };

 const formatPomo = () => {
    const totalSecs = pomoSecondsLeft !== undefined ? pomoSecondsLeft : (pomoMinutes || 25) * 60;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCustomTimeSet = (unit, val) => {
    const currentTotal = pomoSecondsLeft !== undefined ? pomoSecondsLeft : (pomoMinutes || 25) * 60;
    let h = Math.floor(currentTotal / 3600);
    let m = Math.floor((currentTotal % 3600) / 60);
    let s = currentTotal % 60;

    const num = Math.max(0, parseInt(val, 10) || 0);
    if (unit === 'h') h = num;
    if (unit === 'm') m = Math.min(59, num);
    if (unit === 's') s = Math.min(59, num);

    const newTotal = (h * 3600) + (m * 60) + s;
    onChange({ pomoSecondsLeft: newTotal, pomoMinutes: Math.ceil(newTotal / 60), pomoRunning: false });
  };

  const formatStopwatch = () => {
    const totalSecs = Math.floor(stopwatchMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const tenths = Math.floor((stopwatchMs % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
  };

  const clockData = formatTime();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-4 group/widget">
      
      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 mb-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 opacity-70 group-hover/widget:opacity-100 transition-opacity">
        <button
          onClick={() => onChange({ mode: 'clock' })}
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
            mode === 'clock' ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'
          }`}
        >
          Clock
        </button>
        <button
          onClick={() => onChange({ mode: 'pomodoro' })}
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
            mode === 'pomodoro' ? 'bg-sky-500/30 text-sky-300 shadow-sm' : 'text-white/50 hover:text-white'
          }`}
        >
          Pomodoro
        </button>
        <button
          onClick={() => onChange({ mode: 'stopwatch' })}
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
            mode === 'stopwatch' ? 'bg-emerald-500/30 text-emerald-300 shadow-sm' : 'text-white/50 hover:text-white'
          }`}
        >
          Stopwatch
        </button>
      </div>

      {/* CLOCK MODE */}
      {mode === 'clock' && (
        <div className="flex flex-col items-center justify-center text-center">
          <div 
            className={`${font} font-bold tracking-tight flex items-baseline justify-center select-none`}
            style={{ fontSize: `${fontSize}px`, ...textGlowStyle }}
          >
            <span>{clockData.main}</span>
            <span className="text-3xl opacity-80 ml-1 font-mono">{clockData.sub}</span>
          </div>
          <div className="text-xs uppercase tracking-widest text-white/60 font-medium mt-1">
            {clockData.dateStr}
          </div>
        </div>
      )}

      {/* POMODORO MODE */}
      {mode === 'pomodoro' && (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
              pomoState === 'focus' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {pomoState === 'focus' ? 'Deep Work' : 'Break Time'}
            </span>
            <span className="text-xs text-white/40">Cycle #{pomoCycles + 1}</span>
          </div>

          {/* Timer Display / Inputs */}
      {!pomoRunning ? (
        <div className="flex items-center justify-center gap-1.5 my-1 font-mono text-white select-none">
          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max="23"
              placeholder="00"
              value={Math.floor((pomoSecondsLeft !== undefined ? pomoSecondsLeft : (pomoMinutes || 25) * 60) / 3600)}
              onChange={(e) => handleCustomTimeSet('h', e.target.value)}
              className="w-12 text-center bg-white/5 border border-white/20 rounded-lg py-1 font-bold text-lg text-[#00F2FE] focus:outline-none focus:border-[#00F2FE]"
              title="Hours"
            />
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Hr</span>
          </div>

          <span className="text-xl font-bold text-white/40 -mt-3">:</span>

          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max="59"
              placeholder="00"
              value={Math.floor(((pomoSecondsLeft !== undefined ? pomoSecondsLeft : (pomoMinutes || 25) * 60) % 3600) / 60)}
              onChange={(e) => handleCustomTimeSet('m', e.target.value)}
              className="w-12 text-center bg-white/5 border border-white/20 rounded-lg py-1 font-bold text-lg text-[#00F2FE] focus:outline-none focus:border-[#00F2FE]"
              title="Minutes"
            />
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Min</span>
          </div>

          <span className="text-xl font-bold text-white/40 -mt-3">:</span>

          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max="59"
              placeholder="00"
              value={(pomoSecondsLeft !== undefined ? pomoSecondsLeft : (pomoMinutes || 25) * 60) % 60}
              onChange={(e) => handleCustomTimeSet('s', e.target.value)}
              className="w-12 text-center bg-white/5 border border-white/20 rounded-lg py-1 font-bold text-lg text-[#00F2FE] focus:outline-none focus:border-[#00F2FE]"
              title="Seconds"
            />
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Sec</span>
          </div>
        </div>
      ) : (
        <div
          className={`${font} font-bold tracking-tight select-none my-1`}
          style={{ fontSize: `${fontSize}px`, ...textGlowStyle }}
        >
          {formatPomo()}
        </div>
      )}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => onChange({ pomoRunning: !pomoRunning })}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all ${
                pomoRunning 
                  ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                  : 'bg-sky-500 hover:bg-sky-400 text-black'
              }`}
            >
              {pomoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{pomoRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button
              onClick={() => onChange({ pomoRunning: false, pomoSecondsLeft: pomoMinutes * 60 })}
              className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
              <button
                onClick={() => onChange({ pomoMinutes: 25, pomoSecondsLeft: 25 * 60, pomoRunning: false, pomoState: 'focus' })}
                className="px-2 py-0.5 rounded text-[11px] bg-white/5 hover:bg-white/15 text-white/70"
              >
                25m
              </button>
              <button
                onClick={() => onChange({ pomoMinutes: 50, pomoSecondsLeft: 50 * 60, pomoRunning: false, pomoState: 'focus' })}
                className="px-2 py-0.5 rounded text-[11px] bg-white/5 hover:bg-white/15 text-white/70"
              >
                50m
              </button>
              <button
                onClick={() => onChange({ pomoMinutes: 5, pomoSecondsLeft: 5 * 60, pomoRunning: false, pomoState: 'shortBreak' })}
                className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
              >
                5m
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOPWATCH MODE */}
      {mode === 'stopwatch' && (
        <div className="flex flex-col items-center justify-center text-center">
          <div 
            className={`${font} font-bold tracking-tight select-none my-1`}
            style={{ fontSize: `${fontSize}px`, ...textGlowStyle }}
          >
            {formatStopwatch()}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => onChange({ stopwatchRunning: !stopwatchRunning })}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all ${
                stopwatchRunning 
                  ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
              }`}
            >
              {stopwatchRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{stopwatchRunning ? 'Stop' : 'Start'}</span>
            </button>

            <button
              onClick={() => onChange({ stopwatchRunning: false, stopwatchMs: 0 })}
              className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title="Reset Stopwatch"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Edit Pill in Edit Mode */}
      {editMode && (
        <div className="absolute -bottom-8 flex items-center gap-2 bg-zenith-900/95 border border-white/20 px-3 py-1 rounded-full text-xs shadow-2xl z-40">
          <label className="text-white/60 flex items-center gap-1 text-[11px]">
            <span>Font:</span>
            <select 
              value={font} 
              onChange={(e) => onChange({ font: e.target.value })}
              className="bg-black/60 text-white rounded px-1.5 py-0.5 border border-white/15 outline-none cursor-pointer"
            >
              <option value="font-mono">JetBrains Mono</option>
              <option value="font-sans">Inter Sans</option>
              <option value="font-orbitron">Orbitron Neon</option>
              <option value="font-syne">Syne Modern</option>
            </select>
          </label>

          <label className="text-white/60 flex items-center gap-1 text-[11px]">
            <span>Glow:</span>
            <input 
              type="range" 
              min="0" 
              max="40" 
              value={glowSpread} 
              onChange={(e) => onChange({ glowSpread: Number(e.target.value) })}
              className="w-16 h-1 accent-sky-400 cursor-pointer" 
            />
          </label>

          <label className="text-white/60 flex items-center gap-1 text-[11px]">
            <span>Color:</span>
            <input 
              type="color" 
              value={color} 
              onChange={(e) => onChange({ color: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" 
            />
          </label>

          <label className="text-white/60 flex items-center gap-1 text-[11px]">
            <span>Size:</span>
            <input 
              type="range" 
              min="36" 
              max="120" 
              value={fontSize} 
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="w-16 h-1 accent-sky-400 cursor-pointer" 
            />
          </label>
        </div>
      )}

    </div>
  );
}

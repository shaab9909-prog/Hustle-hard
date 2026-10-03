import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Edit3, 
  Plus, 
  Volume2, 
  VolumeX, 
  Settings as SettingsIcon, 
  Maximize, 
  Minimize, 
  LogOut 
} from 'lucide-react';
import AmbientAudioWidget from './components/AmbientAudioWidget';
import StudyHoursTracker from './components/StudyHoursTracker';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { soundEngine } from './utils/audioEngine';
import { PRESET_WALLPAPERS, CURATED_QUOTES } from './constants/presets';
import DraggableBox from './components/DraggableBox';
import ClockTimerWidget from './components/ClockTimerWidget';
import DailyGoalsWidget from './components/DailyGoalsWidget';
import QuoteBlockWidget from './components/QuoteBlockWidget';
import ExitProtectionModal from './components/ExitProtectionModal';
import GroupStudyWidget from './components/GroupStudyWidget';
import SettingsDrawer from './components/SettingsDrawer';
const DEFAULT_WARNINGS = [];
export default function App() {
  // 1. Dual Mode & Shell UI State
  const [editMode, setEditMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const isDesktopApp = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('background');
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [exitStepIndex, setExitStepIndex] = useState(0);
  const [exitCountdown, setExitCountdown] = useState(30);
  const [showWarningManager, setShowWarningManager] = useState(false);
 // 1. LEFT BOTTOM: Audio Widget
  const [audioWidget, setAudioWidget] = useState({
    x: 30,
    y: 420,
    width: 300,
    height: 360,
  });

  // 2. LEFT TOP: Study Room Widget
  const [groupWidget, setGroupWidget] = useState({
    x: 30,
    y: 80,
    width: 300,
    height: 320,
  });

  // 3. CENTER BOTTOM: Auto Study Tracker Widget (Clock/Pomodoro ke theek neeche)
  const [trackerWidget, setTrackerWidget] = useState({
    x: 480,
      y: 420,
    width: 310,
    height: 350,
  });
  const [warningPrompts, setWarningPrompts] = useState(() => {
    const saved = localStorage.getItem('user_exit_warnings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      "Kya aap sach me padhai band karke jaana chahte ho?",
      "Aaj ka daily goal abhi poora nahi hua hai!",
      "Aapka distraction aapke future goals ko delay kar raha hai.",
      "Aakhiri baar soch lo: kya ye break waqai zaroori hai?"
    ];
  });

  const handleUpdateWarnings = (newVal) => {
    setWarningPrompts((prev) => {
      const updated = typeof newVal === 'function' ? newVal(prev) : newVal;
      localStorage.setItem('user_exit_warnings', JSON.stringify(updated));
      return updated;
    });
  };
 // Window Focus Lock (Safe for both Tauri & Web Browser)
  useEffect(() => {
    let cleanup = null;

    const setupFocusTrap = async () => {
      // Check agar Tauri environment mein chal raha hai
      if (typeof window !== "undefined" && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const appWindow = getCurrentWindow();
          const unlisten = await appWindow.onFocusChanged(({ payload: focused }) => {
            if (!focused) {
              // agar focus loose ho
            }
          });
          cleanup = unlisten;
        } catch (err) {
          console.warn("Tauri API skipped in browser mode");
        }
      }
    };

    setupFocusTrap();

    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, []);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAddWarning = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newEntry = {
      title: newTitle.trim(),
      description: newDesc.trim() || 'Focus on your goals!'
    };
    handleUpdateWarnings([...warningPrompts, newEntry]);
    setNewTitle('');
    setNewDesc('');
  };

  const handleDeleteWarning = (indexToDelete) => {
    if (warningPrompts.length <= 5) {
      alert("Minimum 5 warnings zaroori hain! Aap 5 se kam delete nahi kar sakte.");
      return;
    }
    handleUpdateWarnings(warningPrompts.filter((_, idx) => idx !== indexToDelete));
  };
  useEffect(() => {
    if (exitModalOpen) {
      setExitCountdown(30);
      const interval = setInterval(() => {
        setExitCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [exitModalOpen, exitStepIndex]);
  const [studyMinutesToday, setStudyMinutesToday] = useState(45);

  // Inactivity Timer for Auto-Hiding Controls (3 seconds)
  const inactivityTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    setControlsVisible(true);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!settingsOpen && !exitModalOpen && !editMode) {
      inactivityTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [settingsOpen, exitModalOpen, editMode]);

  useEffect(() => {
    const handleMouseMove = () => resetInactivityTimer();
    const handleKeyDown = (e) => {
      resetInactivityTimer();
      if ((e.key === 'e' || e.key === 'E') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        setEditMode(prev => !prev);
      }
      if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      toggleFullscreen();
    }

    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      setExitStepIndex(0);
      setExitModalOpen(true);
      return;
    }
      if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (editMode) {
          setEditMode(false);
        } else if (!exitModalOpen) {
          triggerExitProtection();
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetInactivityTimer]);

  useEffect(() => {
    let unlisten = null;

    const interceptClose = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();

        unlisten = await appWindow.onCloseRequested(async (event) => {
          event.preventDefault();
          setExitStepIndex(0);
          setExitModalOpen(true);
        });
      } catch {
        // Browser fallback
      }
    };

    interceptClose();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

    

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

    

   // 2. Background Customizer State
  const [bgConfig, setBgConfig] = useState(() => {
    const saved = localStorage.getItem('zenith_bg_config_v2');
    return saved ? JSON.parse(saved) : {
      type: 'custom',
      presetId: 'midnight',
      customUrl: '/default-bg.jpg',
      brightness: 0.45,
      blur: 2,
      scale: 105,
      vignette: true,
      showGrid: false
    };
  });

  useEffect(() => {
   localStorage.setItem('zenith_bg_config_v2', JSON.stringify(bgConfig));
  }, [bgConfig]);

  // 3. Audio & Ambience State
  const [ambientSound, setAmbientSound] = useState('off');
  const [ambientVolume, setAmbientVolume] = useState(0.4);

  const handleSoundChange = (type) => {
    setAmbientSound(type);
    soundEngine.setAmbient(type, ambientVolume);
  };

  const handleVolumeChange = (vol) => {
    setAmbientVolume(vol);
    soundEngine.setVolume(vol);
  };

  // 4. Clock & Timer Widget State
  const [clockWidget, setClockWidget] = useState(() => {
    const saved = localStorage.getItem('zenith_clock_widget');
    return saved ? JSON.parse(saved) : {
      x: 440,
      y: 80,
      width: 440,
      height: 180,
      mode: 'clock',
      format24h: false,
      font: 'font-mono',
      color: '#38bdf8',
      glowSpread: 22,
      fontSize: 72,
      pomoMinutes: 25,
      pomoSecondsLeft: 25 * 60,
      pomoRunning: false,
      pomoState: 'focus',
      pomoCycles: 0,
      stopwatchMs: 0,
      stopwatchRunning: false
    };
  });

  useEffect(() => {
    localStorage.setItem('zenith_clock_widget', JSON.stringify(clockWidget));
  }, [clockWidget]);

  // Realtime Clock Tick
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pomodoro Timer Interval
  useEffect(() => {
    let interval = null;
    if (clockWidget.pomoRunning && clockWidget.pomoSecondsLeft > 0) {
      interval = setInterval(() => {
        setClockWidget(prev => {
          if (prev.pomoSecondsLeft <= 1) {
            soundEngine.playChime();
            const nextCycles = prev.pomoState === 'focus' ? prev.pomoCycles + 1 : prev.pomoCycles;
            const nextState = prev.pomoState === 'focus' ? (nextCycles % 4 === 0 ? 'longBreak' : 'shortBreak') : 'focus';
            const nextMins = nextState === 'focus' ? 25 : (nextState === 'shortBreak' ? 5 : 15);
            return {
              ...prev,
              pomoRunning: false,
              pomoSecondsLeft: nextMins * 60,
              pomoState: nextState,
              pomoCycles: nextCycles
            };
          }
          return { ...prev, pomoSecondsLeft: prev.pomoSecondsLeft - 1 };
        });
        setStudyMinutesToday(prev => prev + (1 / 60));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockWidget.pomoRunning, clockWidget.pomoSecondsLeft]);

  // Stopwatch Interval
  useEffect(() => {
    let swInterval = null;
    if (clockWidget.stopwatchRunning) {
      swInterval = setInterval(() => {
        setClockWidget(prev => ({ ...prev, stopwatchMs: prev.stopwatchMs + 100 }));
      }, 100);
    }
    return () => clearInterval(swInterval);
  }, [clockWidget.stopwatchRunning]);

  // 5. Daily Goals Widget State
const [goalsWidget, setGoalsWidget] = useState(() => {
  const saved = localStorage.getItem('zenith_goals_widget_v4');
  return saved ? JSON.parse(saved) : {
    x: window.innerWidth > 1400 ? window.innerWidth - 440 : 1050,
    y: 240,
    width: 360,
    height: 380,
    bgOpacity: 0.4,
    textColor: '#ffffff',
    tasks: [
      { id: '1', text: 'Physics: Solve 40 Electrostatics MCQs', completed: true, tag: 'Physics' },
      { id: '2', text: 'Chemistry: Memorize Aldehydes Mechanisms', completed: false, tag: 'Organic' },
      { id: '3', text: 'Complete Mock Test Analysis (1h)', completed: false, tag: 'Revision' }
    ]
  };
});

useEffect(() => {
  localStorage.setItem('zenith_goals_widget_v4', JSON.stringify(goalsWidget));
}, [goalsWidget]);

  useEffect(() => {
    localStorage.setItem('zenith_goals_widget_v2', JSON.stringify(goalsWidget));
  }, [goalsWidget]);
  // Daily 3:00 AM Reset for Tasks
  useEffect(() => {
    const now = new Date();
    // 3:00 AM se pehle ka time pichle din count hoga
    const adjusted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const currentStudyDay = adjusted.toISOString().slice(0, 10);
    const lastResetDay = localStorage.getItem('zenith_last_task_reset');

    if (lastResetDay !== currentStudyDay) {
      setGoalsWidget((prev) => ({
        ...prev,
        tasks: []
      }));
      localStorage.setItem('zenith_last_task_reset', currentStudyDay);
    }
  }, []);

  // 6. Freeform Quotes List State
  const [quotesList, setQuotesList] = useState(() => {
    const saved = localStorage.getItem('zenith_quotes_list');
    return saved ? JSON.parse(saved) : [
      {
        id: 'quote-1',
        x: 880,
        y: 280,
        width: 380,
        height: 180,
        text: "The pain of discipline is far less than the pain of regret.",
        author: "Zenith Mindset",
        fontSize: 20,
        color: '#facc15',
        glow: true,
        bgOpacity: 0.35,
        font: 'font-playfair'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('zenith_quotes_list', JSON.stringify(quotesList));
  }, [quotesList]);

  

  const triggerExitProtection = useCallback(() => {
    setExitStepIndex(0);
    setExitModalOpen(true);
    setControlsVisible(true);
  }, []);

  useEffect(() => {
    let unlisten = null;

    listen('show-exit-barrier', () => {
      setExitStepIndex(0);
      setExitModalOpen(true);
      setControlsVisible(true);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
 // NEET 2027 Countdown Logic (Target: 2 May 2027)
  const calculateDaysLeft = () => {
    const targetDate = new Date('2027-05-02T00:00:00');
    const today = new Date();
    const diffTime = targetDate - today;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const [daysLeft, setDaysLeft] = useState(calculateDaysLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setDaysLeft(calculateDaysLeft());
    }, 1000 * 60);
    return () => clearInterval(timer);
  }, []);
  const handleStayAndStudy = () => {
    setExitModalOpen(false);
    setExitStepIndex(0);
  };

 const handleNextExitStep = async () => {
  const totalWarnings = warningPrompts.length > 0 ? warningPrompts.length : 5;
  
  if (exitStepIndex < totalWarnings - 1) {
    setExitStepIndex(prev => prev + 1);
  } else {
    // Modal band karo
    setExitModalOpen(false);
    setExitStepIndex(0);

    // Tauri window ko safely close karna bina crash hue
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().destroy();
    } catch {
      window.close();
    }
  }
};
  const updateClockPos = (newPos) => {
    setClockWidget(prev => ({ ...prev, ...newPos }));
  };
  const updateGoalsPos = (newPos) => {
    setGoalsWidget(prev => ({ ...prev, ...newPos }));
  };
  const updateQuotePos = (id, newPos) => {
    setQuotesList(prev => prev.map(q => q.id === id ? { ...q, ...newPos } : q));
  };

  const handleAddQuote = () => {
    const randomText = CURATED_QUOTES[Math.floor(Math.random() * CURATED_QUOTES.length)];
    const newQuote = {
      id: Date.now(),
      text: randomText,
      x: 100,
      y: 200,
      color: '#00F2FE', // Default neon cyan/teal ya jo color chahiye
    };
    setQuotesList(prev => [...prev, newQuote]);
  };

  const handleDeleteQuote = (id) => {
    setQuotesList(prev => prev.filter(q => q.id !== id));
  };

  const currentWallpaperUrl = useMemo(() => {
    if (bgConfig.customUrl) return bgConfig.customUrl;
    const preset = PRESET_WALLPAPERS.find(p => p.id === bgConfig.presetId);
    return preset ? preset.url : '';
  }, [bgConfig]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-black text-white font-sans">
      
      {/* BACKGROUND LAYER */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-700 ease-out"
        style={{
          backgroundImage: currentWallpaperUrl ? `url('${currentWallpaperUrl}')` : 'radial-gradient(ellipse at bottom, #111827 0%, #030712 100%)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          filter: `brightness(${bgConfig.brightness}) blur(${bgConfig.blur}px)`,
          transform: `scale(${bgConfig.scale / 100})`,
        }}
      />

      {bgConfig.showGrid && <div className="absolute inset-0 bg-grid pointer-events-none opacity-40"></div>}
      {bgConfig.vignette && <div className="absolute inset-0 vignette pointer-events-none"></div>}
{/* CUSTOM TOP-RIGHT CORNER CLOSE BUTTON */}
      <div className="fixed top-3 right-3 z-50">
        <button
          onClick={triggerExitProtection}
          className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white flex items-center justify-center transition-all shadow-lg cursor-pointer"
          title="Exit Study Canvas"
        >
          <span className="text-sm font-bold leading-none">✕</span>
        </button>
      </div>
      {/* TOP HEADER CONTROLS */}
      <header 
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${
          controlsVisible || editMode ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zenith-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          
         <button 
        onClick={() => setFocusMode(prev => !prev)}
        className={`flex items-center gap-2 pr-3 border-r border-white/10 transition-all cursor-pointer px-2 py-1 rounded-lg ${
          focusMode ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'text-white/80 hover:text-white'
        }`}
        title="Toggle Ambient Focus Glow"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${
          editMode 
            ? 'bg-amber-400 animate-ping' 
            : focusMode 
              ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse' 
              : 'bg-emerald-400 animate-pulse'
        }`} />
        <span className="font-syne text-xs uppercase tracking-widest font-bold">
                {editMode ? 'Edit Mode' : focusMode ? 'DEEP FOCUS' : 'Focus Mode'}
              </span>
            </button>
        {!isDesktopApp && (
            <a
  href="https://github.com/shaab9909-prog/Hustle-hard/releases/download/v1.0.0/hustle-hard_0.1.0_x64-setup.exe"
  download
  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-400/30 no-underline"
  title="Download Hustle Hard Setup (.exe)"
>
  ⬇ Download for Windows
</a>
)}

            <button
              onClick={() => setEditMode(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                editMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Edit Mode (Press 'E')"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{editMode ? 'Done' : 'Customize'}</span>
            </button>

<button
  onClick={handleAddQuote}
  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20"
  title="Add new draggable quote block"
>
  <Plus className="w-3.5 h-3.5" />
  <span>New Note</span>
</button>

          <div className="flex items-center gap-1 px-2 border-l border-white/10">
            <button
              onClick={() => handleSoundChange(ambientSound === 'off' ? 'rain' : 'off')}
              className={`p-1.5 rounded-full transition-all ${ambientSound !== 'off' ? 'text-sky-400 bg-sky-400/20' : 'text-white/60 hover:text-white'}`}
              title={ambientSound !== 'off' ? `Playing: ${ambientSound}` : "Turn on study ambient noise"}
            >
              {ambientSound !== 'off' ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button 
            onClick={() => { setSettingsOpen(true); setControlsVisible(true); }}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Open Studio Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          <button 
            onClick={triggerExitProtection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 transition-all ml-1"
            title="Exit Canvas (Protected)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>

        </div>
      </header>

      {/* EDIT MODE BANNER */}
      {editMode && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono shadow-lg flex items-center gap-2 pointer-events-none">
          <span>✦ Drag any widget to reposition. Drag bottom-right corner to resize. Press 'E' when done.</span>
        </div>
      )}

      {/* WIDGET 1: CLOCK & POMODORO */}
      <DraggableBox
        x={clockWidget.x}
        y={clockWidget.y}
        width={clockWidget.width}
        height={clockWidget.height}
        editMode={editMode}
        onUpdate={updateClockPos}
        minWidth={320}
        minHeight={150}
      >
          <ClockTimerWidget
            widget={clockWidget}
            currentTime={currentTime}
            editMode={editMode}
            onChange={(updated) => setClockWidget(prev => ({ ...prev, ...updated }))}
          />
        </DraggableBox>
{/* WIDGET: AMBIENT AUDIO & LO-FI */}
        <DraggableBox
          x={audioWidget.x}
          y={audioWidget.y}
          width={audioWidget.width}
          height={audioWidget.height}
          editMode={editMode}
          onUpdate={(pos) => setAudioWidget((prev) => ({ ...prev, ...pos }))}
          minWidth={280}
          minHeight={300}
      >
        <div className={`w-full h-full transition-all duration-500 ${focusMode ? 'opacity-20 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
          <AmbientAudioWidget />
        </div>
      </DraggableBox> 
        {/* WIDGET: STUDY HOURS TRACKER */}
        {/* WIDGET: STUDY HOURS TRACKER */}
        <DraggableBox
          x={trackerWidget.x}
          y={trackerWidget.y}
          width={trackerWidget.width}
          height={trackerWidget.height}
          editMode={editMode}
          onUpdate={(pos) => setTrackerWidget((prev) => ({ ...prev, ...pos }))}
          minWidth={280}
          minHeight={320}
        >
          <div className={`w-full h-full transition-all duration-500 ${focusMode ? 'opacity-20 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
            <StudyHoursTracker />
          </div>
        </DraggableBox>
      {/* WIDGET 2: DAILY GOALS */}
      <DraggableBox
        x={goalsWidget.x}
        y={goalsWidget.y}
        width={goalsWidget.width}
        height={goalsWidget.height}
        editMode={editMode}
        onUpdate={updateGoalsPos}
        minWidth={300}
        minHeight={260}
      > 
          <div className={`w-full h-full transition-all duration-500 ${focusMode ? 'opacity-20 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
            <DailyGoalsWidget
              widget={goalsWidget}
              editMode={editMode}
              onChange={(updated) => setGoalsWidget(prev => ({ ...prev, ...updated }))}
            />
          </div>
        </DraggableBox>
      {/* WIDGET 3: GROUP STUDY */}
      <DraggableBox
        x={groupWidget.x}
        y={groupWidget.y}
        width={groupWidget.width}
        height={groupWidget.height}
        editMode={editMode}
        onUpdate={(updated) => setGroupWidget((prev) => ({ ...prev, ...updated }))}
        minWidth={260}
        minHeight={200}
     >
          <div className={`w-full h-full transition-all duration-500 ${focusMode ? 'opacity-20 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
            <GroupStudyWidget />
          </div>
        </DraggableBox>
      {/* WIDGET 3: MOTIVATIONAL QUOTES */}
      {quotesList.map((quote) => (
        <DraggableBox
          key={quote.id}
          x={quote.x}
          y={quote.y}
          width={quote.width}
          height={quote.height}
          editMode={editMode}
          onUpdate={(pos) => updateQuotePos(quote.id, pos)}
          minWidth={240}
          minHeight={120}
        >
          <QuoteBlockWidget 
            quote={quote} 
            editMode={editMode}
            onDelete={() => handleDeleteQuote(quote.id)}
            onChange={(updated) => setQuotesList(prev => prev.map(q => q.id === quote.id ? { ...q, ...updated } : q))}
          />
        </DraggableBox>
      ))}

      {/* BOTTOM RIGHT STATUS BADGE */}
      <div 
        className={`fixed bottom-4 right-4 z-40 transition-all duration-500 ease-in-out ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <div className="px-3.5 py-1.5 rounded-full bg-zenith-900/60 backdrop-blur-md border border-white/10 text-white/60 text-xs flex items-center gap-2 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          
          <span className="text-white/80 font-mono">{Math.floor(studyMinutesToday)}m focused</span>
        </div>
      </div>

      {/* SETTINGS DRAWER */}
      {settingsOpen && (
        <SettingsDrawer 
          onClose={() => setSettingsOpen(false)}
          activeTab={activeSettingsTab}
          setActiveTab={setActiveSettingsTab}
          bgConfig={bgConfig}
          setBgConfig={setBgConfig}
          ambientSound={ambientSound}
          ambientVolume={ambientVolume}
          onSoundChange={handleSoundChange}
          onVolumeChange={handleVolumeChange}
          warningPrompts={warningPrompts}
          setWarningPrompts={handleUpdateWarnings}
          clockWidget={clockWidget}
          setClockWidget={setClockWidget}
          onResetPositions={() => {
            setClockWidget(prev => ({
              ...prev,
              x: Math.floor(window.innerWidth / 2 - 220),
              y: Math.floor(window.innerHeight * 0.16)
            }));
            setGoalsWidget(prev => ({
              ...prev,
              x: Math.floor(window.innerWidth * 0.05),
              y: Math.floor(window.innerHeight * 0.45)
            }));
          }}
        />
      )}
{exitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-white/15 p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
              🛡️
            </div>

            <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-semibold">
              Exit Barrier {exitStepIndex + 1} of {warningPrompts.length > 0 ? warningPrompts.length : 1}
            </span>

            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
              {typeof warningPrompts[exitStepIndex] === 'object'
                ? warningPrompts[exitStepIndex]?.title
                : `Warning #${exitStepIndex + 1}`}
            </h2>
            <p className="text-sm text-white/60 mb-6 max-w-sm mx-auto">
              {typeof warningPrompts[exitStepIndex] === 'object'
                ? warningPrompts[exitStepIndex]?.description
                : warningPrompts[exitStepIndex]}
            </p>

            <div className="w-full flex flex-col gap-3">
              {/* Stay Button */}
              <button
                onClick={() => setExitModalOpen(false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 text-black font-bold text-sm hover:opacity-95 transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                Stay & Study (Recommended) 💪
              </button>

              <button
  disabled={exitCountdown > 0}
  onClick={handleNextExitStep}
  className={`w-full py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
    exitCountdown > 0
      ? 'bg-zinc-800 border-zinc-700/50 text-zinc-500 cursor-not-allowed opacity-60'
      : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 cursor-pointer'
  }`}
>
  {exitCountdown > 0
    ? `Wait ${exitCountdown}s to proceed...`
    : (exitStepIndex >= ((warningPrompts.length > 0 ? warningPrompts.length : 2) - 1)
      ? "I really must quit now"
      : `Proceed to Warning ${exitStepIndex + 2}`)}
</button>
            </div>

            <button
              onClick={() => setExitModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
{/* NEET 2027 Neon Countdown Widget */}
      <div className="fixed top-6 right-6 z-40 select-none pointer-events-auto">
        <div className="px-6 py-4 rounded-2xl bg-[#0B1120] backdrop-blur-md border border-[#2DD4BF]/40 shadow-[0_0_15px_rgba(0,242,254,0.35)] flex flex-col items-center">
          <span className="text-xs font-mono tracking-widest uppercase text-[#94A3B8] font-semibold drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">
            Target NEET 2027
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-extrabold text-[#00F2FE] font-mono tracking-tight drop-shadow-[0_0_15px_rgba(0,242,254,0.6)]">
              {daysLeft}
            </span>
            <span className="text-xs uppercase tracking-wider text-[#2DD4BF] font-bold">
              Days Left
            </span>
          </div>
        </div>
      </div>
{/* Manage Warnings Button */}
      <button 
        onClick={() => setShowWarningManager(true)}
        className="fixed bottom-4 right-4 z-40 bg-zinc-900/90 hover:bg-zinc-800 text-rose-400 border border-rose-500/30 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur cursor-pointer flex items-center gap-1.5 transition-all">
       Manage Warnings ({warningPrompts.length > 0 ? warningPrompts.length : 'Default'})
      </button>

      {/* Manage Warnings Modal Box */}
      {showWarningManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-md text-left shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Manage Exit Warnings</h3>
              <button 
                onClick={() => setShowWarningManager(false)} 
                className="text-zinc-400 hover:text-white text-sm px-2 py-1 rounded bg-zinc-800 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWarning} className="flex flex-col gap-2.5 mb-4 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <input 
                type="text" 
                placeholder="Warning Title (e.g. AIIMS Delhi chahiye na?)" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <input 
                type="text" 
                placeholder="Description (e.g. 1 question aur practice karo)" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)} 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button 
                type="submit" 
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium py-1.5 rounded-lg text-xs transition-all cursor-pointer">
                + Add Warning
              </button>
            </form>

            <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
              {warningPrompts.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-3">
                  Default warnings chal rahi hain. Nayi warning add karoge toh wo exit screen par aane lagegi.
                </p>
              ) : (
                warningPrompts.map((w, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-zinc-800/70 border border-zinc-700/50 p-2.5 rounded-lg">
                    <div className="pr-2">
                      <p className="text-xs font-semibold text-rose-300">{idx + 1}. {w.title}</p>
                      <p className="text-[11px] text-zinc-400">{w.description}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteWarning(idx)} 
                      className="text-zinc-500 hover:text-rose-400 text-xs px-2 py-1 cursor-pointer">
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative">
            <button 
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ⬇
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Install Hustle Hard</h3>
            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              App ko apne device par direct install karne ke liye:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left text-xs text-white/80 space-y-2 mb-4">
              <p>💻 <b>Desktop:</b> Address bar mein <b>Install (monitor icon)</b> par click karein, ya Chrome ke 3-dots (⋮) ➔ <b>Install page as app</b>.</p>
              <p>📱 <b>Mobile:</b> Chrome 3-dots (⋮) ➔ <b>Add to Home Screen</b>.</p>
            </div>
            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
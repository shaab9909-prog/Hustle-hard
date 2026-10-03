import React, { useState, useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
export default function ExitProtectionModal({ 
  stepIndex, 
  warnings, 
  studyMinutes, 
  onStay, 
  onNext, 
  onClose 
}) {
  const DEFAULT_LIST = [
    { title: "Bhai, thodi der aur padh le.", description: "Just 15 more minutes. Ek baar exit ho gaya toh flow toot jayega." },
    { title: "Aaj ka target complete hua?", description: "Consistency is key for NEET 2027. Habit mat todo." },
    { title: "Competition abhi bhi padh raha hai.", description: "Thousands of aspirants are studying right now. Give yourself the edge." },
    { title: "Kal par mat daalo.", description: "Procrastination mat karo. Session poora karke jao." },
    { title: "Final Warning: Are you sure?", description: "Soch lo, dream medical college ke liye 1 question aur karlo." },
    { title: "AIIMS Delhi chahiye na?", description: "Selection wahi paate hain jo give up nahi karte." }
  ];

  // Agar user ne app se warning add ki hai toh use uthayega, warna default
  const savedWarnings = JSON.parse(localStorage.getItem('neet_custom_warnings') || '[]');
  const warningList = savedWarnings.length > 0 ? savedWarnings : DEFAULT_LIST;

  const currentWarning = warningList[stepIndex] || warningList[0];
  const isFinal = stepIndex >= warningList.length - 1;
  const progressPercent = Math.round(((stepIndex + 1) / warningList.length) * 100);

  // 30 SECONDS COUNTDOWN TIMER
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    // Har warning step aate hi timer wapas 30s par shuru hoga
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stepIndex]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-white/15 p-8 shadow-2xl text-center flex flex-col items-center">
        
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4 shadow-lg animate-bounce">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Stepper Dots */}
        <div className="flex items-center gap-2 mb-3">
          {warnings.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex ? 'w-8 bg-rose-500' : (i < stepIndex ? 'w-3 bg-rose-500/50' : 'w-3 bg-white/20')
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400/90 font-semibold mb-3">
          Exit Barrier {stepIndex + 1} of {warnings.length}
        </span>

        {/* Warning Text */}
        <h2 className="text-2xl font-bold font-syne text-white tracking-wide mb-2 leading-tight">
          "{currentWarning.text}"
        </h2>
        <p className="text-sm text-white/60 mb-6 max-w-sm">
          {currentWarning.subtitle || "Think about the syllabus and consistency. A quick exit now breaks your momentum."}
        </p>

        {/* Session Info */}
        <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 mb-6 flex items-center justify-around text-xs">
          <div>
            <div className="text-white/40 uppercase tracking-wider text-[10px]">Session Time</div>
            <div className="text-base font-bold text-sky-400 font-mono">{studyMinutes} mins</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-white/40 uppercase tracking-wider text-[10px]">Barrier Status</div>
            <div className="text-base font-bold text-rose-400 font-mono">{progressPercent}% tested</div>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onStay}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 text-black font-bold text-sm tracking-wide shadow-xl hover:shadow-sky-500/25 hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Stay & Study (Recommended)</span>
            <span className="text-base">💪</span>
          </button>

          {/* 30-Second Lock Action Button */}
          <button
            disabled={countdown > 0}
            onClick={async () => {
  if (isFinal) {
    try {
      await invoke('force_close_app');
    } catch {
      window.close();
    }
  } else {
    onNext();
  }
}}
            className={`w-full py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
              countdown > 0
                ? 'bg-zinc-800 border-zinc-700/50 text-zinc-500 cursor-not-allowed opacity-60'
                : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 cursor-pointer'
            }`}
          >
            {countdown > 0 
              ? `Wait ${countdown}s to proceed...` 
              : (isFinal ? "I really must quit now" : `Proceed to Warning ${stepIndex + 2} →`)}
          </button>
        </div>

        <button 
          onClick={onStay}
          className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
          title="Return to Study"
        >
          <X className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}
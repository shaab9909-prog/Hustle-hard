import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, X, Trash2, RotateCcw } from 'lucide-react';
import { PRESET_WALLPAPERS, DEFAULT_WARNINGS } from '../constants/presets';

export default function SettingsDrawer({ 
  onClose, 
  activeTab, 
  setActiveTab, 
  bgConfig, 
  setBgConfig,
  ambientSound, 
  ambientVolume, 
  onSoundChange, 
  onVolumeChange,
  warningPrompts, 
  setWarningPrompts, 
  clockWidget, 
  setClockWidget,
  onResetPositions
}) {
  const [newWarningText, setNewWarningText] = useState('');
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setBgConfig(prev => ({
        ...prev,
        type: 'custom',
        customUrl: uploadEvent.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddWarning = (e) => {
    e.preventDefault();
    if (!newWarningText.trim()) return;
    const newStep = {
      id: Date.now().toString(),
      text: newWarningText.trim(),
      subtitle: "Added by you to prevent distraction."
    };
    setWarningPrompts([...warningPrompts, newStep]);
    setNewWarningText('');
  };

  const handleDeleteWarning = (id) => {
    if (warningPrompts.length <= 2) {
      alert("Minimum 2 warning barriers required for safety!");
      return;
    }
    setWarningPrompts(warningPrompts.filter(w => w.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md h-full bg-zenith-900 border-l border-white/10 shadow-2xl flex flex-col p-6 overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold font-syne">Studio Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 my-4 bg-black/40 p-1 rounded-xl border border-white/10">
          {[
            { id: 'background', label: 'Canvas' },
            { id: 'ambience', label: 'Audio' },
           
           { id: 'layout', label: 'Layout' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-sky-500 text-black shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: BACKGROUND CUSTOMIZER */}
        {activeTab === 'background' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-white/60 mb-2">Preset Wallpapers</h3>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_WALLPAPERS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setBgConfig(prev => ({ ...prev, presetId: preset.id, customUrl: '' }))}
                    className={`p-2 rounded-xl text-left border text-xs font-medium transition-all ${
                      bgConfig.presetId === preset.id && !bgConfig.customUrl
                        ? 'border-sky-400 bg-sky-500/20 text-white shadow-lg'
                        : 'border-white/10 bg-black/40 text-white/70 hover:border-white/20'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-white/60 mb-2">Custom Image Upload</h3>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Upload Local Image...</span>
                </button>
                {bgConfig.customUrl && (
                  <button
                    onClick={() => setBgConfig(prev => ({ ...prev, customUrl: '' }))}
                    className="py-2 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-white/10">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">Brightness Dimmer</span>
                  <span className="font-mono text-sky-400">{Math.round(bgConfig.brightness * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.05"
                  value={bgConfig.brightness}
                  onChange={(e) => setBgConfig(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-black/60 rounded-lg accent-sky-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">Background Blur</span>
                  <span className="font-mono text-sky-400">{bgConfig.blur}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  value={bgConfig.blur}
                  onChange={(e) => setBgConfig(prev => ({ ...prev, blur: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-black/60 rounded-lg accent-sky-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">Zoom Scale</span>
                  <span className="font-mono text-sky-400">{bgConfig.scale}%</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="150" 
                  value={bgConfig.scale}
                  onChange={(e) => setBgConfig(prev => ({ ...prev, scale: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-black/60 rounded-lg accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-white/80">Cinematic Vignette</span>
                <input 
                  type="checkbox"
                  checked={bgConfig.vignette}
                  onChange={(e) => setBgConfig(prev => ({ ...prev, vignette: e.target.checked }))}
                  className="w-4 h-4 rounded accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/80">Grid Matrix Overlay</span>
                <input 
                  type="checkbox"
                  checked={bgConfig.showGrid}
                  onChange={(e) => setBgConfig(prev => ({ ...prev, showGrid: e.target.checked }))}
                  className="w-4 h-4 rounded accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AMBIENCE & AUDIO ENGINE */}
        {activeTab === 'ambience' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-white/60 mb-2">Procedural Audio Generator</h3>
              <p className="text-xs text-white/50 mb-4">Pure synthesized sound waves generated right in your browser. Zero external bandwidth, 100% offline study flow.</p>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'off', label: 'Silent Flow' },
                  { id: 'rain', label: 'Kyoto Rainstorm' },
                  { id: 'brown', label: 'Deep Brown Noise' },
                  { id: 'alpha', label: '10Hz Alpha Waves' },
                  { id: 'white', label: 'Clean White Noise' }
                ].map(snd => (
                  <button
                    key={snd.id}
                    onClick={() => onSoundChange(snd.id)}
                    className={`p-3 rounded-xl text-left border text-xs font-medium transition-all ${
                      ambientSound === snd.id 
                        ? 'border-sky-400 bg-sky-500/20 text-sky-300 shadow-md font-bold' 
                        : 'border-white/10 bg-black/40 text-white/70 hover:border-white/20'
                    }`}
                  >
                    {snd.label}
                  </button>
                ))}
              </div>
            </div>

            {ambientSound !== 'off' && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">Ambience Master Volume</span>
                  <span className="font-mono text-sky-400">{Math.round(ambientVolume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="1.0" 
                  step="0.05"
                  value={ambientVolume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-black/60 rounded-lg accent-sky-400 cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        
        {/* TAB 4: LAYOUT & PERSISTENCE */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-white/60 mb-2">Canvas Repositioning</h3>
              <button
                onClick={onResetPositions}
                className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Widgets to Center</span>
              </button>
            </div>

            <div className="pt-2 border-t border-white/10">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-white/60 mb-2">Shortcuts Cheat Sheet</h3>
              <div className="space-y-2 text-xs text-white/70">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Toggle Edit Mode</span>
                  <kbd className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20 font-mono text-[10px]">E</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Toggle Fullscreen</span>
                  <kbd className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20 font-mono text-[10px]">F</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Exit Protected Modal</span>
                  <kbd className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20 font-mono text-[10px]">ESC</kbd>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  if (confirm("Reset all settings and tasks to factory default?")) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold"
              >
                Factory Reset Canvas
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

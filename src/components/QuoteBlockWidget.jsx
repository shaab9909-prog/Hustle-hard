import React, { useState, useEffect } from 'react';
import { Quote as QuoteIcon, Sparkles, RotateCcw, Edit3, Trash2 } from 'lucide-react';
import { CURATED_QUOTES } from '../constants/presets';

export default function QuoteBlockWidget({ quote = {}, editMode, onDelete, onChange }) {
  const { text = '', author, fontSize = 18, color = '#00F2FE', glow = true, bgOpacity = 0.35 } = quote;
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(text);

  useEffect(() => {
    setDraftText(text);
  }, [text]);

  const handleSave = () => {
    onChange({ text: draftText });
    setIsEditing(false);
  };

  const handleShuffle = () => {
    if (Array.isArray(CURATED_QUOTES) && CURATED_QUOTES.length > 0) {
      const nextQuote = CURATED_QUOTES[Math.floor(Math.random() * CURATED_QUOTES.length)];
      onChange({ text: nextQuote });
    }
  };

  const quoteGlowStyle = glow ? {
    textShadow: `0 0 15px ${color}60`
  } : {};

  return (
    <div
      className="w-full h-full rounded-2xl p-4 flex flex-col justify-between backdrop-blur-xl border border-white/10 shadow-2xl relative group/quote select-none"
      style={{
        backgroundColor: `rgba(14, 17, 24, ${bgOpacity})`
      }}
    >
      {/* Subtle Quote Icon Watermark */}
      <div className="absolute -bottom-4 -right-2 text-white/5 pointer-events-none">
        <QuoteIcon className="w-24 h-24" />
      </div>

      {/* Header Controls */}
      <div className="flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-1.5 text-white/50 text-xs font-syne font-semibold tracking-wider uppercase">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Affirmation</span>
        </div>

        <div className="flex items-center gap-1 opacity-70 group-hover/quote:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleShuffle}
            className="p-1 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Shuffle Quote"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Edit Text"
          >
            <Edit3 className="w-3 h-3" />
          </button>

          {editMode && (
            <div className="flex items-center gap-1.5 ml-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
              <input
                type="color"
                value={color || '#00F2FE'}
                onChange={(e) => onChange({ color: e.target.value })}
                className="w-4 h-4 rounded-full cursor-pointer bg-transparent border-0 p-0"
                title="Change Color"
              />
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Remove Block"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quote Content */}
      <div className="flex-1 flex items-center justify-center z-10 my-1 overflow-y-auto">
        {isEditing ? (
          <div className="w-full flex flex-col gap-2">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-xs text-white resize-none focus:outline-none focus:border-amber-400"
              rows="3"
            />
            <button
              type="button"
              onClick={handleSave}
              className="self-end px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer"
            >
              Save
            </button>
          </div>
        ) : (
          <p
            className="text-center font-medium leading-relaxed select-none"
            style={{
              fontSize: `${fontSize}px`,
              color: color,
              ...quoteGlowStyle
            }}
          >
            "{text || 'Every master was once a disaster. Keep solving.'}"
          </p>
        )}
      </div>

      {/* Author Tag */}
      <div className="text-right text-[11px] text-white/40 tracking-wider z-10 uppercase font-mono">
        — {author || 'Focus Canvas'}
      </div>
    </div>
  );
}
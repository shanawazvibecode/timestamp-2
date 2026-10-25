import React, { useState } from 'react';
import { Sliders, Eye, EyeOff, Sparkles, Key, Film, Gauge } from 'lucide-react';

const PACING_OPTIONS = [
  { id: 'fast', label: 'Fast Pacing', sub: '3–6s / image', desc: 'High energy, TikTok/Reels, rapid cuts' },
  { id: 'balanced', label: 'Balanced Story', sub: '6–10s / image', desc: 'Standard YouTube essays & podcasts' },
  { id: 'relaxed', label: 'Relaxed Doc', sub: '10–15s / image', desc: 'Cinematic long takes, documentaries' },
];

const FPS_OPTIONS = [
  { value: 24, label: '24 fps', sub: 'Cinema standard' },
  { value: 25, label: '25 fps', sub: 'PAL standard' },
  { value: 30, label: '30 fps', sub: 'NTSC / Web' },
  { value: 60, label: '60 fps', sub: 'Smooth 60p' },
];

export default function SettingsBar({
  pacing,
  setPacing,
  fps,
  setFps,
  geminiKey,
  setGeminiKey,
  masterStyle,
  setMasterStyle,
  disabled
}) {
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#12141D]/90 p-5 sm:p-6 backdrop-blur-xl shadow-lg space-y-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
            Processing & Timeline Settings
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {showAdvanced ? 'Hide AI Prompt Config' : 'AI Prompt Configuration'}
        </button>
      </div>

      {/* Main Settings Grid: Pacing & FPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pacing Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scene Image Pacing</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PACING_OPTIONS.map((opt) => {
              const active = pacing === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPacing(opt.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    active
                      ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-md shadow-indigo-500/10'
                      : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:bg-white/[0.04]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className={`text-[10px] font-mono mt-0.5 ${active ? 'text-indigo-300' : 'text-slate-500'}`}>
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Frame Rate Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span>XML Sequence Timebase (FPS)</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FPS_OPTIONS.map((opt) => {
              const active = fps === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setFps(opt.value)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    active
                      ? 'border-cyan-500 bg-cyan-500/15 text-white shadow-md shadow-cyan-500/10'
                      : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:bg-white/[0.04]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-xs font-mono font-bold">{opt.label}</span>
                  <span className={`text-[9px] mt-0.5 ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Advanced / AI Prompt Configuration */}
      {showAdvanced && (
        <div className="pt-4 border-t border-white/5 space-y-4 animate-in fade-in duration-200">
          
          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Gemini API Key (Optional, stored locally)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Leave blank to use intelligent offline prompt templates
              </span>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                disabled={disabled}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Master Visual Style Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Master Visual Style Direction</span>
            </label>
            <textarea
              rows={2}
              value={masterStyle}
              onChange={(e) => setMasterStyle(e.target.value)}
              disabled={disabled}
              placeholder="e.g. Cinematic 8k film still, hyper-detailed, atmospheric neon rim lighting, shot on 35mm lens, moody cyberpunk aesthetic..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 resize-none"
            />
          </div>

        </div>
      )}

    </div>
  );
}

import React from 'react';
import { Layers, Sparkles, Monitor, Globe, Radio } from 'lucide-react';

export default function Navbar({ backendOnline }) {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#090A0F]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#12141D] rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <Sparkles className="w-3.5 h-3.5 text-indigo-300 absolute -top-1 -right-1 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SyncForge Studio
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold tracking-wide uppercase">
                v1.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Precision Long-Form Video Timestamping & Timeline Engine
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Dual-Mode Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-300">
            {isElectron ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium">Desktop App</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium">Browser Mode</span>
              </>
            )}
          </div>

          {/* Backend Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs">
            <span className="relative flex h-2 w-2">
              {backendOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className={backendOnline ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
              {backendOnline ? "Engine Ready" : "Connecting..."}
            </span>
          </div>

        </div>

      </div>
    </header>
  );
}

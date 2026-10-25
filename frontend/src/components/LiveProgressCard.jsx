import React from 'react';
import { Loader2, Terminal, CheckCircle2, AlertCircle, Clock, Activity } from 'lucide-react';
import { formatSeconds } from '../utils/formatters';

export default function LiveProgressCard({
  progress,
  stage,
  message,
  logs,
  elapsedSeconds,
  status
}) {
  const isCompleted = status === 'completed' || progress >= 100;
  const isFailed = status === 'failed';

  // Determine active stage pill
  const getStageStatus = (stageNumber) => {
    if (isCompleted) return 'done';
    if (stageNumber === 1) {
      if (progress < 15) return 'active';
      return 'done';
    }
    if (stageNumber === 2) {
      if (progress >= 15 && progress < 80) return 'active';
      if (progress >= 80) return 'done';
      return 'pending';
    }
    if (stageNumber === 3) {
      if (progress >= 80 && progress < 100) return 'active';
      if (progress >= 100) return 'done';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#12141D]/95 p-6 backdrop-blur-xl shadow-2xl space-y-6">
      
      {/* Top Header: Current status and elapsed time */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center flex-shrink-0">
            {isFailed ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">
                {isCompleted ? 'Analysis & Generation Complete' : isFailed ? 'Processing Failed' : stage || 'Processing Pipeline'}
              </h3>
              <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                isCompleted 
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                  : isFailed 
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' 
                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 animate-pulse'
              }`}>
                {isCompleted ? '100%' : `${Math.round(progress)}%`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {message || 'Running transcription and scene segmentation...'}
            </p>
          </div>
        </div>

        {/* Elapsed Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 font-mono text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Elapsed:</span>
          <span className="text-cyan-300 font-bold">{formatSeconds(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Main Animated Gradient Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-white/[0.04] rounded-full overflow-hidden p-0.5 border border-white/5 relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                : isFailed
                ? 'bg-rose-500'
                : 'animate-shimmer'
            }`}
            style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
          />
        </div>
      </div>

      {/* Stage Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        
        {/* Stage 1 */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
          getStageStatus(1) === 'active'
            ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
            : getStageStatus(1) === 'done'
            ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-300'
            : 'border-white/5 bg-white/[0.01] text-slate-500'
        }`}>
          <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-mono font-bold">
            1
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">Audio Extraction</p>
            <p className="text-[10px] font-mono text-slate-400">0% – 15%</p>
          </div>
        </div>

        {/* Stage 2 */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
          getStageStatus(2) === 'active'
            ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
            : getStageStatus(2) === 'done'
            ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-300'
            : 'border-white/5 bg-white/[0.01] text-slate-500'
        }`}>
          <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-mono font-bold">
            2
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">Whisper Transcription</p>
            <p className="text-[10px] font-mono text-slate-400">15% – 80%</p>
          </div>
        </div>

        {/* Stage 3 */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
          getStageStatus(3) === 'active'
            ? 'border-purple-500/50 bg-purple-500/10 text-white'
            : getStageStatus(3) === 'done'
            ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-300'
            : 'border-white/5 bg-white/[0.01] text-slate-500'
        }`}>
          <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-mono font-bold">
            3
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">Scene Grouping & XML</p>
            <p className="text-[10px] font-mono text-slate-400">80% – 100%</p>
          </div>
        </div>

      </div>

      {/* Terminal Live Logs */}
      {logs && logs.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-black/40 p-3 font-mono text-[11px] space-y-1 overflow-hidden">
          <div className="flex items-center gap-1.5 text-slate-500 pb-1 border-b border-white/5 text-[10px] uppercase font-bold tracking-wider">
            <Terminal className="w-3 h-3 text-indigo-400" />
            <span>Real-time Processing Engine Logs</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto pt-1">
            {logs.map((log, index) => (
              <div key={index} className="text-slate-400 flex items-start gap-2">
                <span className="text-indigo-400 select-none">›</span>
                <span className="text-slate-300">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Download, Lock, CheckCircle2, Copy, FileText, Film, FileSpreadsheet, Sparkles, MessageSquareCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDownloadUrl } from '../utils/api';

export default function ActionHub({
  jobId,
  isCompleted,
  scenes = [],
  segments = [],
  words = [],
  geminiTranscript = ''
}) {
  const [copiedType, setCopiedType] = useState(null);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  useEffect(() => {
    if (isCompleted && !hasCelebrated) {
      setHasCelebrated(true);
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#6366f1', '#a855f7', '#06b6d4', '#10b981']
        });
      } catch (e) {
        // ignore if confetti not loaded
      }
    }
  }, [isCompleted, hasCelebrated]);

  const copyToClipboard = (type, content) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyGemini = () => {
    if (geminiTranscript) {
      copyToClipboard('gemini', geminiTranscript);
      return;
    }
    // Fallback if not loaded
    const fallbackText = (segments.length > 0 ? segments : scenes)
      .map((s, idx) => `[${s.start_formatted || s.start} -> ${s.end_formatted || s.end}] ${s.text}`)
      .join('\n\n');
    copyToClipboard('gemini', fallbackText);
  };

  const handleCopySRT = () => {
    if (!segments || segments.length === 0) return;
    const srtText = segments
      .map((s, idx) => {
        const start = s.start || 0;
        const end = s.end || 0;
        const formatSrtTime = (sec) => {
          const hrs = Math.floor(sec / 3600);
          const mins = Math.floor((sec % 3600) / 60);
          const secs = Math.floor(sec % 60);
          const ms = Math.floor((sec - Math.floor(sec)) * 1000);
          return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
        };
        return `${idx + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${s.text}\n`;
      })
      .join('\n');
    copyToClipboard('srt', srtText);
  };

  const handleCopyWords = () => {
    if (!words || words.length === 0) return;
    const wordsText = words
      .map((w, idx) => `${idx + 1}. [${w.start_formatted || w.start}s - ${w.end_formatted || w.end}s] ${w.word}`)
      .join('\n');
    copyToClipboard('words', wordsText);
  };

  return (
    <div className="w-full space-y-4">
      
      {/* Primary Gemini Quick Action Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all duration-500 ${
        isCompleted
          ? 'border-indigo-500/50 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-cyan-950/40 shadow-2xl shadow-indigo-500/10'
          : 'border-white/5 bg-[#12141D]/40 opacity-60'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                AI Storyboard Ready
              </span>
              {isCompleted && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Ready for Gemini
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Copy Formatted Timestamps for Gemini
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              1-Click copy of line-by-line speech and word durations. Paste directly under your Gemini Storyboard Director prompt to let AI decide image pacing & Google Flow hooks.
            </p>
          </div>

          {/* Quick Copy Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={!isCompleted}
              onClick={handleCopyGemini}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs font-mono tracking-wide transition-all shadow-lg ${
                isCompleted
                  ? copiedType === 'gemini'
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white hover:opacity-95 shadow-indigo-500/25 active:scale-95 cursor-pointer'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              {copiedType === 'gemini' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Copied Script for Gemini!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Script for Gemini
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!isCompleted}
              onClick={handleCopySRT}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-mono font-medium border transition-colors ${
                isCompleted
                  ? copiedType === 'srt'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300 hover:text-white cursor-pointer'
                  : 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
              }`}
              title="Copy Raw SubRip .SRT to clipboard"
            >
              {copiedType === 'srt' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy .SRT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Standard .SRT Subtitles */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
            isCompleted
              ? 'border-indigo-500/40 bg-[#12141D] hover:border-indigo-500/70'
              : 'border-white/5 bg-[#12141D]/40 opacity-55'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            {isCompleted ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Sentence .SRT
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/5 text-slate-400 border border-white/10 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          <div className="mt-3">
            <h4 className="text-sm font-semibold text-white">Standard .SRT</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Complete spoken phrases with millisecond precision for video players & editors.
            </p>
          </div>

          <div className="mt-4">
            {isCompleted ? (
              <a
                href={getDownloadUrl(jobId, 'srt')}
                download
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download .SRT
              </a>
            ) : (
              <button disabled className="w-full py-2 rounded-xl text-xs text-slate-500 bg-white/[0.02] border border-white/5 cursor-not-allowed">
                Locked
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Word-Level .SRT Subtitles */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
            isCompleted
              ? 'border-cyan-500/40 bg-[#12141D] hover:border-cyan-500/70'
              : 'border-white/5 bg-[#12141D]/40 opacity-55'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <MessageSquareCode className="w-5 h-5 text-cyan-400" />
            </div>
            {isCompleted ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Word-by-Word
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/5 text-slate-400 border border-white/10 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          <div className="mt-3">
            <h4 className="text-sm font-semibold text-white">Word-by-Word .SRT</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Every single word with individual start/end timestamps for micro-syncing.
            </p>
          </div>

          <div className="mt-4">
            {isCompleted ? (
              <a
                href={getDownloadUrl(jobId, 'words_srt')}
                download
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-xs text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-md shadow-cyan-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download Words .SRT
              </a>
            ) : (
              <button disabled className="w-full py-2 rounded-xl text-xs text-slate-500 bg-white/[0.02] border border-white/5 cursor-not-allowed">
                Locked
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Gemini Storyboard Script .TXT */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
            isCompleted
              ? 'border-purple-500/40 bg-[#12141D] hover:border-purple-500/70'
              : 'border-white/5 bg-[#12141D]/40 opacity-55'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            {isCompleted ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Gemini .TXT
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/5 text-slate-400 border border-white/10 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          <div className="mt-3">
            <h4 className="text-sm font-semibold text-white">Storyboard Script</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Formatted prompt-ready text with line durations and word timings for AI.
            </p>
          </div>

          <div className="mt-4">
            {isCompleted ? (
              <a
                href={getDownloadUrl(jobId, 'gemini_txt')}
                download
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-xs text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md shadow-purple-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download Script (.txt)
              </a>
            ) : (
              <button disabled className="w-full py-2 rounded-xl text-xs text-slate-500 bg-white/[0.02] border border-white/5 cursor-not-allowed">
                Locked
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Word Timestamps .JSON */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
            isCompleted
              ? 'border-emerald-500/40 bg-[#12141D] hover:border-emerald-500/70'
              : 'border-white/5 bg-[#12141D]/40 opacity-55'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            {isCompleted ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                JSON Data
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/5 text-slate-400 border border-white/10 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          <div className="mt-3">
            <h4 className="text-sm font-semibold text-white">Word Timestamps</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Structured JSON array with start, end, duration, and probability per word.
            </p>
          </div>

          <div className="mt-4">
            {isCompleted ? (
              <a
                href={getDownloadUrl(jobId, 'words_json')}
                download
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download .JSON
              </a>
            ) : (
              <button disabled className="w-full py-2 rounded-xl text-xs text-slate-500 bg-white/[0.02] border border-white/5 cursor-not-allowed">
                Locked
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Video Editor Timeline & Spreadsheets Bar */}
      {isCompleted && (
        <div className="rounded-xl border border-white/10 bg-[#12141D]/70 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Film className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">Video Editor Timelines & Sheets:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={getDownloadUrl(jobId, 'timeline_xml')}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-cyan-300 font-mono transition-colors"
            >
              <Download className="w-3 h-3" />
              Premiere/DaVinci .XML
            </a>

            <a
              href={getDownloadUrl(jobId, 'csv')}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-emerald-300 font-mono transition-colors"
            >
              <Download className="w-3 h-3" />
              Scenes .CSV
            </a>

            <a
              href={getDownloadUrl(jobId, 'json')}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-purple-300 font-mono transition-colors"
            >
              <Download className="w-3 h-3" />
              Scenes .JSON
            </a>
          </div>
        </div>
      )}

    </div>
  );
}

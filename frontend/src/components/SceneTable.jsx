import React, { useState } from 'react';
import { Search, Copy, Check, MessageSquare, Clock, FileText, AlignLeft, Sparkles } from 'lucide-react';

export default function SceneTable({ scenes = [], segments = [], words = [] }) {
  const [activeTab, setActiveTab] = useState('lines'); // 'lines', 'words', 'scenes'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const handleCopySingle = (id, textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSec = (sec) => {
    if (sec === undefined || sec === null) return '00:00:00.000';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec - Math.floor(sec)) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  // Filter lists based on search
  const q = searchTerm.toLowerCase();

  const filteredSegments = (segments || []).filter((seg) => {
    const text = (seg.text || '').toLowerCase();
    return text.includes(q);
  });

  const filteredWords = (words || []).filter((w) => {
    const word = (w.word || '').toLowerCase();
    return word.includes(q);
  });

  const filteredScenes = (scenes || []).filter((scene) => {
    const text = (scene.text || '').toLowerCase();
    const prompt = (scene.prompt || '').toLowerCase();
    const fn = (scene.image_filename || '').toLowerCase();
    return text.includes(q) || prompt.includes(q) || fn.includes(q);
  });

  const hasData = (segments && segments.length > 0) || (scenes && scenes.length > 0) || (words && words.length > 0);
  if (!hasData) return null;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#12141D]/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
      
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-white/5">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('lines')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'lines'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Speech Lines ({segments.length || scenes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('words')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'words'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Word Timestamps ({words.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scenes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'scenes'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Timeline Scenes ({scenes.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-500/80"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* TAB 1: Speech Lines & Sentences */}
      {activeTab === 'lines' && (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono uppercase text-slate-400">
                <th className="py-3 px-4 font-semibold">#</th>
                <th className="py-3 px-4 font-semibold">Start Time</th>
                <th className="py-3 px-4 font-semibold">End Time</th>
                <th className="py-3 px-4 font-semibold">Duration</th>
                <th className="py-3 px-4 font-semibold">Transcript Line</th>
                <th className="py-3 px-4 text-right font-semibold">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {(filteredSegments.length > 0 ? filteredSegments : filteredScenes).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No speech lines found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                (filteredSegments.length > 0 ? filteredSegments : filteredScenes).map((seg, idx) => {
                  const lineNum = idx + 1;
                  const startStr = formatSec(seg.start);
                  const endStr = formatSec(seg.end);
                  const dur = ((seg.end || 0) - (seg.start || 0)).toFixed(2);
                  const isCopied = copiedId === `line-${lineNum}`;

                  return (
                    <tr key={lineNum} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {lineNum}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300 font-medium whitespace-nowrap text-[11px]">
                        {startStr}
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-300 font-medium whitespace-nowrap text-[11px]">
                        {endStr}
                      </td>
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5">
                          {dur}s
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 leading-relaxed font-sans max-w-lg">
                        {seg.text}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopySingle(`line-${lineNum}`, `[${startStr} - ${endStr}] ${seg.text}`)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                          title="Copy line with timestamps"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Word-by-Word Timestamps */}
      {activeTab === 'words' && (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono uppercase text-slate-400">
                <th className="py-3 px-4 font-semibold">Word #</th>
                <th className="py-3 px-4 font-semibold">Spoken Word</th>
                <th className="py-3 px-4 font-semibold">Start Time</th>
                <th className="py-3 px-4 font-semibold">End Time</th>
                <th className="py-3 px-4 font-semibold">Word Duration</th>
                <th className="py-3 px-4 text-right font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredWords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No words found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredWords.map((w, idx) => {
                  const startStr = formatSec(w.start);
                  const endStr = formatSec(w.end);
                  const dur = ((w.end || 0) - (w.start || 0)).toFixed(2);
                  const prob = w.probability ? Math.round(w.probability * 100) : 100;

                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                        {w.index || idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white text-sm">
                        "{w.word}"
                      </td>
                      <td className="py-2.5 px-4 font-mono text-cyan-300 whitespace-nowrap text-[11px]">
                        {startStr}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-indigo-300 whitespace-nowrap text-[11px]">
                        {endStr}
                      </td>
                      <td className="py-2.5 px-4 font-mono whitespace-nowrap text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5">
                          {dur}s
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          prob >= 90 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                        }`}>
                          {prob}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Video Editor Timeline Scenes */}
      {activeTab === 'scenes' && (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono uppercase text-slate-400">
                <th className="py-3 px-4 font-semibold">Scene</th>
                <th className="py-3 px-4 font-semibold">Start</th>
                <th className="py-3 px-4 font-semibold">End</th>
                <th className="py-3 px-4 font-semibold">Dur</th>
                <th className="py-3 px-4 font-semibold">Dialogue</th>
                <th className="py-3 px-4 font-semibold">AI Scene Prompt</th>
                <th className="py-3 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredScenes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No scenes found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredScenes.map((scene) => {
                  const isCopied = copiedId === scene.index;
                  return (
                    <tr key={scene.index} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-cyan-300 text-[11px]">
                        {scene.image_filename}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap text-[11px]">
                        {scene.start_formatted || formatSec(scene.start)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap text-[11px]">
                        {scene.end_formatted || formatSec(scene.end)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5">
                          {scene.duration}s
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-300 leading-relaxed font-sans">
                        <span className="line-clamp-2">{scene.text}</span>
                      </td>
                      <td className="py-3 px-4 max-w-sm text-slate-400 italic text-[11px] leading-relaxed">
                        <span className="line-clamp-2">{scene.prompt || scene.text}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopySingle(scene.index, scene.prompt || scene.text)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                          title="Copy prompt"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

import React, { useRef, useState } from 'react';
import { UploadCloud, FileAudio, FileVideo, X, CheckCircle2, Music, Film } from 'lucide-react';
import { formatBytes, formatSeconds } from '../utils/formatters';

const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.mov', '.mkv', '.webm', '.aac', '.flac'];

export default function HeroDropzone({ selectedFile, onFileSelect, onFileRemove, isProcessing }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const inspectFile = (file) => {
    if (!file) return;

    // Check extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      alert(`Unsupported file format. Please upload an audio or video file (${ACCEPTED_EXTENSIONS.join(', ')})`);
      return;
    }

    // Try detecting client-side duration via HTML5 Audio/Video
    try {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video') || ext === '.mp4' || ext === '.mov' || ext === '.mkv';
      const media = isVideo ? document.createElement('video') : document.createElement('audio');
      media.preload = 'metadata';
      media.src = url;
      media.onloadedmetadata = () => {
        setDetectedDuration(media.duration);
        URL.revokeObjectURL(url);
      };
      media.onerror = () => {
        setDetectedDuration(null);
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      setDetectedDuration(null);
    }

    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      inspectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      inspectFile(e.target.files[0]);
    }
  };

  const isVideoFile = selectedFile && (
    selectedFile.type.startsWith('video') || 
    ['.mp4', '.mov', '.mkv', '.webm'].some(ext => selectedFile.name.toLowerCase().endsWith(ext))
  );

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="hidden"
        disabled={isProcessing}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all duration-300 ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20 shadow-2xl shadow-cyan-500/20 scale-[1.005]'
              : 'border-white/10 hover:border-indigo-500/50 bg-[#12141D]/60 hover:bg-[#12141D]/90'
          }`}
        >
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

          <div className="relative flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-400/50 transition-all duration-300">
                <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                1hr+
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Drop your long-form video or audio file here
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                Supports podcast recordings, interviews, documentaries, and voiceovers up to multi-hour lengths.
              </p>
            </div>

            {/* Supported Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-white/[0.04] border border-white/10 text-slate-300">
                <Music className="w-3 h-3 text-cyan-400" /> MP3, WAV, M4A
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-white/[0.04] border border-white/10 text-slate-300">
                <Film className="w-3 h-3 text-purple-400" /> MP4, MOV, MKV
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#12141D] p-6 shadow-xl shadow-indigo-950/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                {isVideoFile ? (
                  <FileVideo className="w-7 h-7 text-cyan-400" />
                ) : (
                  <FileAudio className="w-7 h-7 text-indigo-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-base truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                  <span>{formatBytes(selectedFile.size)}</span>
                  <span>•</span>
                  <span>{isVideoFile ? 'Video Stream' : 'Audio Track'}</span>
                  {detectedDuration && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-300">~{formatSeconds(detectedDuration)} detected</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!isProcessing && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={onFileRemove}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

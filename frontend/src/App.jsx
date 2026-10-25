import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HeroDropzone from './components/HeroDropzone';
import SettingsBar from './components/SettingsBar';
import LiveProgressCard from './components/LiveProgressCard';
import ActionHub from './components/ActionHub';
import SceneTable from './components/SceneTable';
import { checkBackendHealth, startProcessingJob, subscribeToProgress, getJobDetails } from './utils/api';
import { Play, Sparkles, RefreshCw, Film, Subtitles, FileSpreadsheet, Cpu, Sliders, ChevronDown } from 'lucide-react';

export default function App() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Settings (with default values so user doesn't have to configure anything)
  const [pacing, setPacing] = useState('balanced');
  const [fps, setFps] = useState(24);
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('syncforge_gemini_key') || '');
  const [masterStyle, setMasterStyle] = useState(() => localStorage.getItem('syncforge_master_style') || '');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Job & Progress state
  const [jobId, setJobId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, processing, completed, failed
  const [scenes, setScenes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [words, setWords] = useState([]);
  const [geminiTranscript, setGeminiTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef(null);
  const sseUnsubscribeRef = useRef(null);

  // Persist Gemini settings
  useEffect(() => {
    localStorage.setItem('syncforge_gemini_key', geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    localStorage.setItem('syncforge_master_style', masterStyle);
  }, [masterStyle]);

  // Initial backend health check + polling
  useEffect(() => {
    const check = async () => {
      const ok = await checkBackendHealth();
      setBackendOnline(ok);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Timer effect during active processing
  useEffect(() => {
    if (isProcessing && status === 'processing') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isProcessing, status]);

  const handleStartProcessing = async () => {
    if (!selectedFile) {
      alert('Please select an audio or video file first.');
      return;
    }

    try {
      setIsProcessing(true);
      setStatus('processing');
      setProgress(2);
      setStage('Stage 1: Extracting Audio');
      setMessage('Extracting audio and analyzing waveforms...');
      setLogs(['[00:00:00] Initializing Whisper engine...']);
      setElapsedSeconds(0);
      setScenes([]);
      setSegments([]);
      setWords([]);
      setGeminiTranscript('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('pacing', pacing);
      formData.append('fps', fps.toString());
      if (geminiKey.trim()) formData.append('gemini_api_key', geminiKey.trim());
      if (masterStyle.trim()) formData.append('master_style', masterStyle.trim());

      const res = await startProcessingJob(formData);
      const newJobId = res.job_id;
      setJobId(newJobId);

      // Subscribe to Server-Sent Events (SSE)
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
      }

      sseUnsubscribeRef.current = subscribeToProgress(
        newJobId,
        async (eventData) => {
          if (eventData.progress !== undefined) setProgress(eventData.progress);
          if (eventData.stage) setStage(eventData.stage);
          if (eventData.message) setMessage(eventData.message);
          if (eventData.logs) setLogs(eventData.logs);
          if (eventData.status) setStatus(eventData.status);

          if (eventData.status === 'completed') {
            setIsProcessing(false);
            setProgress(100);
            // Fetch final details with segments, words, and transcript
            try {
              const details = await getJobDetails(newJobId);
              if (details) {
                if (details.scenes) setScenes(details.scenes);
                if (details.segments) setSegments(details.segments);
                if (details.words) setWords(details.words);
                if (details.gemini_transcript) setGeminiTranscript(details.gemini_transcript);
              }
            } catch (err) {
              console.error('Error fetching job details', err);
            }
          } else if (eventData.status === 'failed') {
            setIsProcessing(false);
          }
        },
        (err) => {
          console.warn('SSE connection notice:', err);
        }
      );

    } catch (e) {
      alert(`Failed to start job: ${e.message}`);
      setIsProcessing(false);
      setStatus('failed');
    }
  };

  const handleReset = () => {
    if (sseUnsubscribeRef.current) {
      sseUnsubscribeRef.current();
    }
    setSelectedFile(null);
    setJobId(null);
    setIsProcessing(false);
    setProgress(0);
    setStage('');
    setMessage('');
    setLogs([]);
    setStatus('idle');
    setScenes([]);
    setSegments([]);
    setWords([]);
    setGeminiTranscript('');
    setElapsedSeconds(0);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-cyan-300">
      
      {/* Top Navbar */}
      <Navbar backendOnline={backendOnline} />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        
        {/* Hero Header */}
        <div className="text-center space-y-3 pt-2 pb-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-medium text-cyan-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Local faster-whisper • Word-Level Millisecond Precision</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Generate Timestamped Script & Subtitles{' '}
            <span className="text-gradient-cyan block sm:inline">In 1-Click</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload your audio or video to instantly extract speech with exact millisecond line & word durations. Ready to feed directly into Gemini to decide storyboard visuals, CapCut image durations, and Google Flow clips.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Subtitles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-300 font-medium">Standard .SRT (Sentence Level)</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300 font-medium">Word-by-Word Timestamps</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <FileSpreadsheet className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-300 font-medium">Gemini Storyboard Script</span>
          </div>
        </div>

        {/* Step 1: File Dropzone */}
        <section aria-label="Upload File" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Upload Audio or Video
            </h2>
            {selectedFile && !isProcessing && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <HeroDropzone
            selectedFile={selectedFile}
            onFileSelect={(file) => setSelectedFile(file)}
            onFileRemove={() => setSelectedFile(null)}
            isProcessing={isProcessing}
          />
        </section>

        {/* Optional Collapsible Settings (Hidden by default so user doesn't have to fiddle with anything) */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Optional Advanced Settings (Pacing profile, FPS, API Key)</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`} />
          </button>

          {showAdvancedSettings && (
            <div className="p-5 pt-1 border-t border-white/5">
              <SettingsBar
                pacing={pacing}
                setPacing={setPacing}
                fps={fps}
                setFps={setFps}
                geminiKey={geminiKey}
                setGeminiKey={setGeminiKey}
                masterStyle={masterStyle}
                setMasterStyle={setMasterStyle}
                disabled={isProcessing}
              />
            </div>
          )}
        </div>

        {/* Start Action Button (1-Click, when not processing and not finished) */}
        {status !== 'processing' && status !== 'completed' && (
          <div className="pt-1">
            <button
              type="button"
              disabled={!selectedFile || isProcessing || !backendOnline}
              onClick={handleStartProcessing}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 shadow-2xl ${
                !selectedFile || !backendOnline
                  ? 'bg-white/[0.05] text-slate-500 border border-white/5 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-400 text-white hover:opacity-95 shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer active:scale-[0.99]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Generate Timestamps & Word SRT</span>
              <Sparkles className="w-4 h-4" />
            </button>
            {!backendOnline && (
              <p className="text-center text-xs text-rose-400 mt-2 font-mono">
                Backend server is connecting... Please ensure the Python server is running on :8000.
              </p>
            )}
          </div>
        )}

        {/* Live Progress Card (Visible during or after processing) */}
        {(status === 'processing' || status === 'completed' || status === 'failed') && (
          <section aria-label="Live Progress" className="space-y-3 animate-in fade-in duration-300">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Live Pipeline Progress
            </h2>
            <LiveProgressCard
              progress={progress}
              stage={stage}
              message={message}
              logs={logs}
              elapsedSeconds={elapsedSeconds}
              status={status}
            />
          </section>
        )}

        {/* Unlocked Action & Download Hub */}
        <section aria-label="Downloads" className="space-y-3 pt-2">
          <ActionHub
            jobId={jobId}
            isCompleted={status === 'completed'}
            scenes={scenes}
            segments={segments}
            words={words}
            geminiTranscript={geminiTranscript}
          />
        </section>

        {/* Interactive Speech & Word Timestamps Table */}
        {(segments.length > 0 || scenes.length > 0 || words.length > 0) && (
          <section aria-label="Scene Manifest" className="space-y-3 pt-3 animate-in fade-in duration-500">
            <SceneTable
              scenes={scenes}
              segments={segments}
              words={words}
            />
          </section>
        )}

        {/* Start New Job Button (when completed) */}
        {status === 'completed' && (
          <div className="pt-6 pb-12 text-center">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Process Another Video or Audio File
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500 font-mono">
        <p>SyncForge Studio • Instant Speech-to-Timestamp Engine for Gemini AI Storyboards & Video Editors</p>
      </footer>

    </div>
  );
}

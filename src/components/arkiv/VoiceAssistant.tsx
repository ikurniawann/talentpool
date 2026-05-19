"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";

/* ── App Mapping ──────────────────────────────────────────────── */
const APPS: Record<string, string> = {
  hr: "/dashboard/hris", hris: "/dashboard/hris", hiring: "/dashboard/hris",
  employee: "/dashboard/hris", payroll: "/dashboard/hris",
  erp: "/dashboard/erp", purchasing: "/dashboard/purchasing",
  procurement: "/dashboard/purchasing", inventory: "/dashboard/erp",
  finance: "/dashboard/finance", accounting: "/dashboard/finance",
  crm: "/dashboard/crm", customer: "/dashboard/crm", lead: "/dashboard/crm",
  pipeline: "/dashboard/crm",
  pos: "https://suluinwounderland.com/dashboard/pos/cashier-new",
  cashier: "https://suluinwounderland.com/dashboard/pos/cashier-new",
  order: "https://suluinwounderland.com/dashboard/pos/orders",
  kitchen: "https://suluinwounderland.com/dashboard/pos/kds",
  kds: "https://suluinwounderland.com/dashboard/pos/kds",
  creative: "/dashboard/creative", design: "/dashboard/creative",
  render: "/dashboard/render", settings: "/dashboard/settings",
  profile: "/dashboard/profile", desktop: "/arkiv-os", home: "/arkiv-os",
};

/* ── Types ──────────────────────────────────────────────────────── */
type ClapState = "idle" | "listening" | "detected";

export function VoiceAssistant({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Tekan mikrofon untuk mulai bicara");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const onOpenNotificationsRef = useRef(onOpenNotifications);
  useEffect(() => { onOpenNotificationsRef.current = onOpenNotifications; }, [onOpenNotifications]);

  const [hasMic, setHasMic] = useState(false);
  const [clapState, setClapState] = useState<ClapState>("idle");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const finalTranscriptRef = useRef("");

  /* ── Clap detection refs ─────────────────────────────────────────── */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const clapRafRef = useRef<number | null>(null);
  const clapCooldownRef = useRef(false);
  const clapBufferRef = useRef<number[]>([]);

  /* ── Speech Recognition Init ─────────────────────────────────────── */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setHasMic(true);

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "id-ID";

    rec.onstart = () => { setIsListening(true); setStatus("Mendengarkan..."); };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscriptRef.current += e.results[i][0].transcript;
          handleEnd(finalTranscriptRef.current.trim());
        } else {
          interim += e.results[i][0].transcript;
          setStatus(interim || "Mendengarkan...");
        }
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (e.error === "no-speech") setStatus("Tidak ada suara, coba lagi.");
      else if (e.error === "not-allowed") setStatus("Izin mikrofon ditolak.");
      else if (e.error === "network") setStatus("Error jaringan.");
      else setStatus(`Error: ${e.error}`);
    };

    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  /* ── Clap Detection ────────────────────────────────────────────── */
  const startClapDetection = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.1;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detect = () => {
        analyser.getByteFrequencyData(dataArray);
        // Calculate RMS from frequency data (approx loudness)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);

        // Normalize 0-255 → 0-1
        const normalized = rms / 255;

        clapBufferRef.current.push(normalized);
        if (clapBufferRef.current.length > 20) clapBufferRef.current.shift();

        const recent = clapBufferRef.current.slice(-5);
        const peak = Math.max(...recent);
        const prev = clapBufferRef.current.slice(-10, -5);
        const prevAvg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0;

        // Clap detection: sudden loud peak above threshold with quiet before
        if (
          !isOpen &&
          !clapCooldownRef.current &&
          peak > 0.55 &&        // loud peak
          prevAvg < 0.15 &&     // quiet before
          recent.length >= 2
        ) {
          // Clap detected → open notification center
          clapCooldownRef.current = true;
          setClapState("detected");

          onOpenNotificationsRef.current();
          setStatus("Tepuk tangan terdeteksi — membuka Notifikasi");

          // Cooldown 2s
          setTimeout(() => {
            clapCooldownRef.current = false;
            setClapState("listening");
          }, 2000);
        }

        clapRafRef.current = requestAnimationFrame(detect);
      };

      clapRafRef.current = requestAnimationFrame(detect);
      setClapState("listening");
    } catch (e) {
      console.error("[Clap] Mic access denied:", e);
    }
  }, [isOpen]);

  const stopClapDetection = useCallback(() => {
    if (clapRafRef.current) cancelAnimationFrame(clapRafRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setClapState("idle");
  }, []);

  /* ── Auto-start clap detection on mount ────────────────────────── */
  useEffect(() => {
    startClapDetection();
    return () => stopClapDetection();
  }, [startClapDetection, stopClapDetection]);

  /* ── Pause clap detection when modal open ────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      // Pause animation frame but keep mic open
      if (clapRafRef.current) cancelAnimationFrame(clapRafRef.current);
    } else {
      // Resume clap detection when modal closes
      if (micStreamRef.current && !clapRafRef.current) {
        // restart detection loop
        const analyser = analyserRef.current;
        if (!analyser) return;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const detect = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
          const rms = Math.sqrt(sum / dataArray.length) / 255;
          clapBufferRef.current.push(rms);
          if (clapBufferRef.current.length > 20) clapBufferRef.current.shift();
          const recent = clapBufferRef.current.slice(-5);
          const peak = Math.max(...recent);
          const prev = clapBufferRef.current.slice(-10, -5);
          const prevAvg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0;
          if (
            !isOpen &&
            !clapCooldownRef.current &&
            peak > 0.55 &&
            prevAvg < 0.15
          ) {
            clapCooldownRef.current = true;
            setClapState("detected");
            onOpenNotificationsRef.current();
            setStatus("Tepuk tangan terdeteksi — membuka Notifikasi");
            setTimeout(() => { clapCooldownRef.current = false; setClapState("listening"); }, 2000);
          }
          clapRafRef.current = requestAnimationFrame(detect);
        };
        clapRafRef.current = requestAnimationFrame(detect);
      }
    }
  }, [isOpen]);

  /* ── Cleanup ───────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      stopClapDetection();
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
      if (abortRef.current) abortRef.current.abort();
      window.speechSynthesis.cancel();
    };
  }, [stopClapDetection]);

  /* ── TTS ───────────────────────────────────────────────────────── */
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "id-ID";
    utter.rate = 1.05;
    utter.onend = () => { setSpeaking(false); onEnd?.(); };
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, []);

  /* ── Command parser ────────────────────────────────────────────── */
  const parseCommand = (text: string) => {
    const lower = text.toLowerCase();
    for (const [keyword, url] of Object.entries(APPS)) {
      if (
        lower.includes(`buka ${keyword}`) ||
        lower.includes(`buka aplikasi ${keyword}`) ||
        lower.includes(`pergi ke ${keyword}`) ||
        lower.includes(`ke ${keyword}`)
      ) return { type: "open" as const, url, app: keyword };
    }
    if (lower.includes("ke desktop") || lower.includes("ke beranda")) {
      return { type: "open" as const, url: "/arkiv-os", app: "desktop" };
    }
    return { type: "ask" as const, text };
  };

  /* ── Ollama AI ──────────────────────────────────────────────────── */
  const askOllama = async (userText: string) => {
    setThinking(true);
    setStatus("Berpikir...");
    abortRef.current = new AbortController();

    const prompt = `Kamu adalah AI Assistant untuk Arkiv OS, operating system bisnis.\nJawab singkat, jelas, dan ramah dalam Bahasa Indonesia (1-3 kalimat).\nModul Arkiv OS: HRIS, ERP, CRM, POS, Purchasing, Creative, Settings.\n\nPertanyaan: "${userText}"\n\nJawaban:`;

    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "kimi-k2.6:cloud",
          prompt,
          stream: true,
          options: { temperature: 0.7 },
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Ollama offline");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        chunk.split("\\n").forEach((line) => {
          if (!line.trim()) return;
          try {
            const obj = JSON.parse(line);
            if (obj.response) { full += obj.response; setResponse(full); }
          } catch {}
        });
      }
      setThinking(false);
      return full.trim();
    } catch (e) {
      setThinking(false);
      const fallback = "Maaf, sistem AI (kimi-k2.6:cloud) sedang offline. Pastikan Ollama berjalan di port 11434.";
      setResponse(fallback);
      return fallback;
    }
  };

  /* ── Handle end of speech ───────────────────────────────────────── */
  const handleEnd = async (text: string) => {
    if (!text) return;
    setTranscript(text);
    const cmd = parseCommand(text);

    if (cmd.type === "open") {
      const reply = `Baik, membuka aplikasi ${cmd.app}.`;
      setResponse(reply);
      speakText(reply, () => { window.location.href = cmd.url; });
    } else {
      const aiResponse = await askOllama(text);
      if (aiResponse) speakText(aiResponse);
    }
  };

  /* ── Toggle listening ────────────────────────────────────────────── */
  const toggleListening = () => {
    if (!recognitionRef.current) { setStatus("Browser tidak support Speech Recognition. Gunakan Chrome/Edge."); return; }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      finalTranscriptRef.current = "";
      setTranscript("");
      setResponse("");
      setStatus("Mendengarkan...");
      recognitionRef.current.start();
    }
  };

  /* ── Close modal ─────────────────────────────────────────────────── */
  const closeModal = () => {
    setIsOpen(false);
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    if (abortRef.current) abortRef.current.abort();
    window.speechSynthesis.cancel();
    setIsListening(false);
    setSpeaking(false);
    setThinking(false);
  };

  if (!hasMic) return null;

  return (
    <>
      {/* Floating mic button with clap pulse ring */}
      <button
        onClick={() => { setIsOpen(true); setTranscript(""); setResponse(""); setStatus("Tekan mikrofon untuk mulai bicara"); }}
        className="fixed bottom-24 right-5 z-50 grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-cyan-400/90 text-black shadow-lg shadow-cyan-400/30 backdrop-blur-md transition hover:scale-110 hover:shadow-cyan-400/50 active:scale-95"
        title="Arkiv Voice Assistant — Tepuk tangan untuk aktifkan"
      >
        <Mic className="size-6" />
        {/* Clap listening indicator ring */}
        {clapState === "listening" && (
          <span className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping" style={{ animationDuration: "2s" }} />
        )}
        {clapState === "detected" && (
          <span className="absolute inset-[-8px] rounded-full border-2 border-amber-400 animate-ping" style={{ animationDuration: "0.6s" }} />
        )}
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="relative w-[90vw] max-w-md rounded-3xl border border-white/15 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/20 text-cyan-400">
                  <Mic className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Arkiv Voice Assistant</h3>
                  <p className="text-xs text-white/50">Tepuk tangan atau tekan mikrofon</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* wave animation */}
            <div className="mb-6 flex flex-col items-center">
              <div
                className={`mb-4 flex h-16 items-center justify-center gap-[3px] transition-opacity ${isListening || thinking || speaking ? "opacity-100" : "opacity-40"}`}
              >
                {[0, 0.1, 0.2, 0.3, 0.15, 0.05, 0.25].map((delay, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-colors ${speaking ? "bg-amber-400" : "bg-cyan-400"}`}
                    style={{
                      height: `${[16, 32, 24, 40, 20, 32, 16][i]}px`,
                      animation: `voiceWave ${isListening ? 0.5 : thinking ? 0.8 : speaking ? 0.3 : 1.2}s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>
              <p className="text-center text-sm font-medium text-white/90">{status}</p>
            </div>

            {/* mic big button */}
            <div className="mb-6 flex justify-center">
              <button
                onClick={toggleListening}
                className={`grid h-16 w-16 place-items-center rounded-full border transition active:scale-95 ${
                  isListening
                    ? "border-cyan-400/40 bg-cyan-400/30 text-cyan-300"
                    : "border-cyan-400/30 bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30"
                }`}
              >
                {isListening ? <Square className="size-7" /> : <Mic className="size-7" />}
              </button>
            </div>

            {/* transcript */}
            {transcript && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Anda bilang:</p>
                <p className="text-sm font-medium text-white">{transcript}</p>
              </div>
            )}

            {/* AI response */}
            {response && (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400">Arkiv AI:</p>
                <p className="text-sm font-medium leading-relaxed text-white">{response}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes voiceWave {
          0%, 100% { transform: scaleY(1); opacity: 0.5; }
          50% { transform: scaleY(1.6); opacity: 1; }
        }
      `}</style>
    </>
  );
}

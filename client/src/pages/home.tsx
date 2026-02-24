import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SessionResponse, SessionStatus } from "@shared/schema";
import {
  Copy, Check, Wifi, QrCode, Shield, Zap, Terminal, Trash2,
  Hash, Smartphone, Link2, ExternalLink, Rocket, AlertCircle,
  Loader2, ChevronRight, Globe, Lock,
} from "lucide-react";
import { SiWhatsapp, SiGithub } from "react-icons/si";
import spaceBg from "@assets/image_1771932777762.png";

function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      size: Math.random() * 2.2 + 0.4,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: Math.random() * 0.7 + 0.15,
      dur: Math.random() * 4 + 2,
      delay: Math.random() * 5,
    })), []);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {stars.map((s) => (
        <div key={s.id} className="absolute rounded-full bg-white" style={{
          width: s.size + "px", height: s.size + "px",
          left: s.x + "%", top: s.y + "%", opacity: s.opacity,
          animation: `twinkle-s ${s.dur}s ease-in-out infinite`,
          animationDelay: s.delay + "s",
        }} />
      ))}
    </div>
  );
}

function useWebSocket(sessionId: string | null) {
  const [wsData, setWsData] = useState<{
    status: SessionStatus; pairingCode: string | null;
    qrCode: string | null; credentialsBase64: string | null;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      setWsData(null); return;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", sessionId }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === "status") {
          setWsData((prev) => ({
            status: msg.data.status || prev?.status || "pending",
            pairingCode: msg.data.pairingCode || prev?.pairingCode || null,
            qrCode: msg.data.qrCode || prev?.qrCode || null,
            credentialsBase64: msg.data.credentialsBase64 || prev?.credentialsBase64 || null,
          }));
        }
        if (msg.event === "pairing_code") {
          setWsData((prev) => ({
            ...prev!, status: prev?.status || "connecting",
            pairingCode: msg.data.code, qrCode: prev?.qrCode || null,
            credentialsBase64: prev?.credentialsBase64 || null,
          }));
        }
        if (msg.event === "qr") {
          setWsData((prev) => ({
            ...prev!, status: prev?.status || "connecting",
            pairingCode: prev?.pairingCode || null, qrCode: msg.data.qrCode,
            credentialsBase64: prev?.credentialsBase64 || null,
          }));
        }
      } catch (_) {}
    };
    return () => { ws.close(); wsRef.current = null; };
  }, [sessionId]);
  return { wsData };
}

export default function Home() {
  const { toast } = useToast();
  const [activeMethod, setActiveMethod] = useState<"pairing" | "qr">("pairing");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [initialResponse, setInitialResponse] = useState<SessionResponse | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [copiedPairing, setCopiedPairing] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const { wsData } = useWebSocket(currentSessionId);

  const generateMutation = useMutation({
    mutationFn: async (method: "pairing" | "qr") => {
      const res = await apiRequest("POST", "/api/generate-session", {
        method, phoneNumber: method === "pairing" ? phoneNumber : undefined,
      });
      return (await res.json()) as SessionResponse;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      setInitialResponse(data);
      toast({ title: "Session Initialized", description: "Connection to WhatsApp is being established" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/terminate-session", { sessionId: currentSessionId });
    },
    onSuccess: () => {
      setCurrentSessionId(null); setInitialResponse(null); setPhoneNumber("");
      toast({ title: "Session Ended", description: "All session data has been cleared" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = useCallback((text: string, type: "pairing" | "session" | "creds") => {
    navigator.clipboard.writeText(text);
    if (type === "pairing") { setCopiedPairing(true); setTimeout(() => setCopiedPairing(false), 2000); }
    else if (type === "session") { setCopiedSession(true); setTimeout(() => setCopiedSession(false), 2000); }
    else { setCopiedCreds(true); setTimeout(() => setCopiedCreds(false), 2000); }
  }, []);

  const displayStatus: SessionStatus = wsData?.status || initialResponse?.status || "pending";
  const displayPairingCode = wsData?.pairingCode || initialResponse?.pairingCode || null;
  const displayQrCode = wsData?.qrCode || initialResponse?.qrCode || null;
  const displayCredentials = wsData?.credentialsBase64 || null;
  const sessionString = displayCredentials ? `TRUTH-MD:~${displayCredentials}` : "";

  const formatPairingCode = (code: string) =>
    code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

  return (
    <div className="min-h-screen text-white" style={{ background: "#010208" }}>
      <style>{`
        @keyframes twinkle-s {
          0%,100%{opacity:0.05;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}
        }
        @keyframes neb-drift {
          0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.06) translateY(-8px)}
        }
        @keyframes slide-in {
          from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}
        }
        .card-glow-orange { box-shadow: 0 0 0 1px rgba(255,140,0,0.2), 0 4px 32px rgba(180,80,0,0.12), inset 0 1px 0 rgba(255,200,100,0.05); }
        .card-glow-blue { box-shadow: 0 0 0 1px rgba(56,130,246,0.2), 0 4px 32px rgba(30,80,200,0.1), inset 0 1px 0 rgba(100,160,255,0.04); }
        .card-glow-violet { box-shadow: 0 0 0 1px rgba(139,92,246,0.2), 0 4px 32px rgba(100,50,200,0.1), inset 0 1px 0 rgba(180,140,255,0.04); }
      `}</style>

      <StarField />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:`url(${spaceBg})`,
          backgroundSize:"cover", backgroundPosition:"center",
          opacity: 0.14,
        }} />
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(180deg,rgba(1,2,8,0.6) 0%,rgba(1,2,14,0.45) 50%,rgba(1,2,22,0.7) 100%)",
        }} />
        <div style={{
          position:"absolute", top:"-5%", right:"5%",
          width:"580px", height:"500px", borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(56,130,246,0.18) 0%,rgba(100,60,200,0.09) 45%,transparent 70%)",
          animation:"neb-drift 11s ease-in-out infinite",
        }} />
        <div style={{
          position:"absolute", bottom:"5%", left:"-5%",
          width:"440px", height:"300px", borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(220,80,20,0.22) 0%,rgba(180,40,10,0.1) 55%,transparent 72%)",
          animation:"neb-drift 15s ease-in-out infinite reverse",
        }} />
        <div style={{
          position:"absolute", bottom:"0", right:"0",
          width:"380px", height:"360px", borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(25,70,220,0.24) 0%,rgba(70,30,180,0.1) 55%,transparent 72%)",
          animation:"neb-drift 13s ease-in-out infinite 3s",
        }} />
      </div>

      <div className="relative z-10">
        <nav className="border-b border-white/5 backdrop-blur-md" style={{ background:"rgba(1,3,12,0.7)" }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <span className="font-black text-lg tracking-wide font-mono" style={{
              background:"linear-gradient(135deg,#fff5d0,#ffd580,#ff9500,#ff6a00)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              backgroundClip:"text", fontStyle:"italic",
              filter:"drop-shadow(0 0 10px rgba(255,140,0,0.5))",
            }}>TRUTH-MD</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-600 hidden sm:block">v2.0.0-beta</span>
              <a href="https://github.com/Courtney250/TRUTH-MD.git" target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg transition-all hover:bg-white/5">
                <SiGithub className="w-4 h-4 text-slate-500 hover:text-white transition-colors" />
              </a>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-7xl font-black mb-3 tracking-tight leading-none font-mono" style={{
              background:"linear-gradient(180deg,#fff5e0 0%,#ffd580 20%,#ff9500 50%,#ff6a00 75%,#c94b00 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              backgroundClip:"text", fontStyle:"italic",
              filter:"drop-shadow(0 0 28px rgba(255,130,0,0.65)) drop-shadow(0 2px 10px rgba(0,60,255,0.4))",
            }}>
              TRUTH-MD
            </h1>
            <p className="text-slate-400 text-sm font-mono mt-3 max-w-sm mx-auto">
              WhatsApp Session ID Generator — Secure &amp; Real-time
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5">
              {[
                { icon: Lock, label: "E2E Encrypted", color: "text-blue-400/70" },
                { icon: Zap, label: "Real-time Sync", color: "text-orange-400/70" },
                { icon: Globe, label: "Multi-Device", color: "text-violet-400/70" },
              ].map(({ icon: Icon, label, color }) => (
                <span key={label} className={`inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500`}>
                  <Icon className={`w-3 h-3 ${color}`} /> {label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-bold tracking-[0.15em] select-none" style={{
                color:"#4ade80",
                textShadow:"0 0 8px rgba(74,222,128,0.8)",
                background:"rgba(0,18,6,0.9)",
                border:"1px solid rgba(34,197,94,0.35)",
                borderRadius:"2px",
              }}>
                WOLFTECH
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-2xl p-5 sm:p-7 card-glow-orange" style={{
                background:"rgba(2,8,24,0.8)", backdropFilter:"blur(18px)",
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <Terminal className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-mono font-bold text-sm tracking-wide">Connect WhatsApp</span>
                </div>
                <p className="text-slate-500 text-xs font-mono mb-6">Choose a pairing method to link your account</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {(["pairing", "qr"] as const).map((m) => (
                    <button key={m} data-testid={`button-method-${m}`}
                      onClick={() => setActiveMethod(m)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl font-mono text-xs transition-all"
                      style={activeMethod === m ? {
                        background: m === "pairing" ? "rgba(255,140,0,0.14)" : "rgba(56,130,246,0.14)",
                        border: `1px solid ${m === "pairing" ? "rgba(255,140,0,0.4)" : "rgba(56,130,246,0.4)"}`,
                        color: m === "pairing" ? "#ffcc80" : "#93c5fd",
                      } : {
                        background:"rgba(255,255,255,0.03)",
                        border:"1px solid rgba(255,255,255,0.07)",
                        color:"#64748b",
                      }}>
                      {m === "pairing"
                        ? <Hash className="w-5 h-5" />
                        : <QrCode className="w-5 h-5" />}
                      {m === "pairing" ? "Pairing Code" : "QR Code"}
                    </button>
                  ))}
                </div>

                {activeMethod === "pairing" && (
                  <div className="mb-5">
                    <label className="block text-slate-400 text-[11px] uppercase tracking-widest font-mono mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input data-testid="input-phone" type="tel" value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="2348012345678"
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl font-mono text-sm text-white placeholder:text-slate-700 focus:outline-none transition-all"
                        style={{ background:"rgba(0,0,0,0.45)", border:"1px solid rgba(255,255,255,0.07)" }}
                        onFocus={(e) => e.target.style.borderColor = "rgba(255,140,0,0.45)"}
                        onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.07)"} />
                    </div>
                    <p className="text-slate-600 text-[10px] font-mono mt-1.5">
                      Include country code, no + sign (e.g. 2348012345678)
                    </p>
                  </div>
                )}

                {activeMethod === "qr" && (
                  <div className="mb-5 p-4 rounded-xl text-center" style={{
                    background:"rgba(56,130,246,0.05)", border:"1px solid rgba(56,130,246,0.12)",
                  }}>
                    <QrCode className="w-8 h-8 text-blue-400/40 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs font-mono">A QR code will appear once the connection starts</p>
                  </div>
                )}

                <button data-testid="button-generate"
                  disabled={generateMutation.isPending || (activeMethod === "pairing" && !phoneNumber) || !!currentSessionId}
                  onClick={() => generateMutation.mutate(activeMethod)}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-mono text-sm font-bold tracking-wide transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background:"linear-gradient(135deg,rgba(200,80,5,0.85),rgba(160,50,0,0.9))",
                    border:"1px solid rgba(255,140,0,0.5)",
                    color:"#ffe0b0",
                    boxShadow:"0 0 24px rgba(200,80,0,0.3),inset 0 1px 0 rgba(255,220,150,0.12)",
                  }}>
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                  ) : currentSessionId ? (
                    <><Wifi className="w-4 h-4" /> Session Active</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Start Session <ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </button>
              </div>

              {currentSessionId && (
                <div className="rounded-2xl p-5 sm:p-7 card-glow-blue" style={{
                  background:"rgba(2,8,24,0.8)", backdropFilter:"blur(18px)",
                  animation:"slide-in 0.4s ease-out",
                }}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-mono font-bold text-sm">Live Session</span>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full" style={{
                      background: displayStatus === "connected" ? "rgba(74,222,128,0.12)" : "rgba(251,146,60,0.12)",
                      border: `1px solid ${displayStatus === "connected" ? "rgba(74,222,128,0.3)" : "rgba(251,146,60,0.3)"}`,
                      color: displayStatus === "connected" ? "#4ade80" : "#fb923c",
                    }}>
                      {displayStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1.5">Session Reference</p>
                      <div className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:brightness-110 transition-all"
                        style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.06)" }}
                        onClick={() => handleCopy(currentSessionId, "session")}
                        data-testid="button-copy-session">
                        <span className="font-mono text-sm text-blue-300 flex-1 truncate" data-testid="text-session-id">
                          {currentSessionId}
                        </span>
                        {copiedSession
                          ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          : <Copy className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                      </div>
                    </div>

                    {displayPairingCode && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1.5">Pairing Code</p>
                        <div className="flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer hover:brightness-110 transition-all"
                          style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,140,0,0.25)" }}
                          onClick={() => handleCopy(displayPairingCode, "pairing")}
                          data-testid="button-copy-pairing">
                          <span className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em]"
                            style={{
                              background:"linear-gradient(135deg,#fff5d0,#ffb340,#ff6a00)",
                              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                              filter:"drop-shadow(0 0 14px rgba(255,140,0,0.6))",
                            }}
                            data-testid="text-pairing-code">
                            {formatPairingCode(displayPairingCode)}
                          </span>
                          {copiedPairing
                            ? <Check className="w-5 h-5 text-orange-400 shrink-0" />
                            : <Copy className="w-5 h-5 text-slate-600 shrink-0" />}
                        </div>
                        <p className="text-slate-600 text-[10px] font-mono mt-1.5">
                          WhatsApp → Linked Devices → Link a Device → enter code above
                        </p>
                      </div>
                    )}

                    {!displayPairingCode && activeMethod === "pairing" && displayStatus !== "connected" && displayStatus !== "failed" && (
                      <div className="flex items-center gap-3 p-4 rounded-xl" style={{
                        background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.05)",
                      }}>
                        <Loader2 className="w-4 h-4 text-orange-400 animate-spin shrink-0" />
                        <span className="text-slate-400 font-mono text-xs">Requesting pairing code...</span>
                      </div>
                    )}

                    {displayQrCode && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1.5">Scan with WhatsApp</p>
                        <div className="flex justify-center p-5 bg-white rounded-xl">
                          <img src={displayQrCode} alt="QR Code" className="w-44 h-44 sm:w-52 sm:h-52" data-testid="img-qr-code" />
                        </div>
                        <p className="text-slate-600 text-[10px] font-mono mt-1.5 text-center">
                          WhatsApp → Settings → Linked Devices → Scan QR
                        </p>
                      </div>
                    )}

                    {!displayQrCode && activeMethod === "qr" && displayStatus !== "connected" && displayStatus !== "failed" && (
                      <div className="flex items-center gap-3 p-4 rounded-xl" style={{
                        background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.05)",
                      }}>
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                        <span className="text-slate-400 font-mono text-xs">Generating QR code from WhatsApp...</span>
                      </div>
                    )}

                    {displayStatus === "connected" && displayCredentials && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Session ID</p>
                          <button data-testid="button-copy-credentials"
                            onClick={() => handleCopy(sessionString, "creds")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all hover:brightness-110"
                            style={{ background:"rgba(255,140,0,0.1)", border:"1px solid rgba(255,140,0,0.3)", color:"#ffcc80" }}>
                            {copiedCreds
                              ? <><Check className="w-3 h-3" /> Copied!</>
                              : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                        <div className="p-3.5 rounded-xl cursor-pointer hover:brightness-110 transition-all"
                          style={{ background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,140,0,0.18)" }}
                          onClick={() => handleCopy(sessionString, "creds")}
                          data-testid="div-credentials">
                          <code className="font-mono text-[11px] break-all leading-relaxed"
                            style={{ color:"rgba(255,176,64,0.9)" }}
                            data-testid="text-credentials">
                            {sessionString}
                          </code>
                        </div>
                        <p className="text-slate-600 text-[10px] font-mono mt-1.5">
                          Also sent to your WhatsApp DM. Keep this private.
                        </p>
                      </div>
                    )}

                    {displayStatus === "failed" && (
                      <div className="flex items-center gap-3 p-4 rounded-xl" style={{
                        background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.22)",
                      }}>
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <div>
                          <p className="text-red-400 font-mono text-sm font-semibold">Connection Failed</p>
                          <p className="text-red-400/50 font-mono text-[11px]">Terminate and try again</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button data-testid="button-terminate"
                    onClick={() => terminateMutation.mutate()}
                    disabled={terminateMutation.isPending}
                    className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs text-red-300 transition-all hover:brightness-110 disabled:opacity-40"
                    style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.2)" }}>
                    {terminateMutation.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                    End Session
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl p-5 card-glow-violet" style={{
                background:"rgba(2,8,24,0.8)", backdropFilter:"blur(18px)",
              }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-4">Resources</p>
                <div className="space-y-2.5">
                  <a href="https://github.com/Courtney250/TRUTH-MD.git" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:brightness-110 group"
                    style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.05)" }}
                    data-testid="link-github-repo">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background:"rgba(56,130,246,0.12)" }}>
                      <SiGithub className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-mono font-semibold">Source Code</p>
                      <p className="text-slate-600 text-[10px] font-mono truncate">Courtney250/TRUTH-MD</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-700 group-hover:text-blue-400 transition-colors" />
                  </a>
                  <a href="https://inspiring-genie-ebae09.netlify.app/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:brightness-110 group"
                    style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.05)" }}
                    data-testid="link-deploy-truth-md">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background:"rgba(255,140,0,0.1)" }}>
                      <Rocket className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-mono font-semibold">Deploy</p>
                      <p className="text-slate-600 text-[10px] font-mono truncate">netlify.app</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-700 group-hover:text-orange-400 transition-colors" />
                  </a>
                </div>
              </div>

              <div className="rounded-2xl p-5 card-glow-blue" style={{
                background:"rgba(2,8,24,0.8)", backdropFilter:"blur(18px)",
              }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-4">Why TRUTH-MD</p>
                <div className="space-y-3.5">
                  {[
                    { icon: Shield, title:"E2E Encrypted", sub:"Credentials are never stored on our servers", c:"text-blue-400", bg:"rgba(56,130,246,0.1)" },
                    { icon: Zap, title:"Instant Delivery", sub:"Session ID sent directly to your WhatsApp", c:"text-orange-400", bg:"rgba(255,140,0,0.08)" },
                    { icon: SiWhatsapp, title:"Multi-Device", sub:"Full multi-device linking support", c:"text-green-400", bg:"rgba(34,197,94,0.08)" },
                    { icon: Link2, title:"No Storage", sub:"Sessions auto-cleanup after delivery", c:"text-violet-400", bg:"rgba(139,92,246,0.08)" },
                  ].map(({ icon: Icon, title, sub, c, bg }) => (
                    <div key={title} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: bg }}>
                        <Icon className={`w-3.5 h-3.5 ${c}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-mono font-semibold ${c}`}>{title}</p>
                        <p className="text-slate-600 text-[10px] font-mono leading-relaxed">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{
                background:"rgba(255,140,0,0.05)", border:"1px solid rgba(255,140,0,0.15)",
                backdropFilter:"blur(14px)",
              }}>
                <div className="flex gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-400/70 shrink-0 mt-0.5" />
                  <p className="text-slate-500 text-[10px] font-mono leading-relaxed">
                    Keep your session ID private. Never share it. Sessions auto-expire and are cleaned up after delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <footer className="mt-14 pt-6 border-t border-white/5 text-center space-y-3">
            <p className="text-slate-700 text-[10px] font-mono">
              TRUTH-MD · WhatsApp Session Generator · All connections end-to-end encrypted
            </p>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 select-none" style={{
              background:"rgba(0,18,6,0.9)",
              border:"1px solid rgba(34,197,94,0.35)",
              borderRadius:"2px",
              boxShadow:"0 0 8px rgba(34,197,94,0.15), inset 0 0 12px rgba(34,197,94,0.04)",
              outline:"1px solid rgba(34,197,94,0.08)",
              outlineOffset:"3px",
            }}>
              <span className="text-[9px] font-mono" style={{ color:"rgba(34,197,94,0.35)" }}>█</span>
              <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{
                color:"#4ade80",
                textShadow:"0 0 8px rgba(74,222,128,0.8)",
              }}>
                MADE WITH WOLFTECH
              </span>
              <span className="text-[9px] font-mono" style={{ color:"rgba(34,197,94,0.35)" }}>█</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

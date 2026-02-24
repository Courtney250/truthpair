import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SessionResponse, SessionStatus } from "@shared/schema";
import {
  ArrowUpRight,
  Copy,
  Check,
  Wifi,
  QrCode,
  Shield,
  Zap,
  Terminal,
  Trash2,
  Hash,
  Smartphone,
  Link2,
  ExternalLink,
  Rocket,
  AlertCircle,
  Loader2,
  Bot,
} from "lucide-react";
import { SiWhatsapp, SiGithub } from "react-icons/si";
import spaceBg from "@assets/image_1771932777762.png";

function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 120 }, (_, i) => ({
      id: i,
      size: Math.random() * 2.5 + 0.5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: Math.random() * 0.8 + 0.1,
      dur: Math.random() * 5 + 2,
      delay: Math.random() * 6,
    })),
  []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            width: s.size + "px",
            height: s.size + "px",
            left: s.x + "%",
            top: s.y + "%",
            opacity: s.opacity,
            animation: `twinkle-star ${s.dur}s ease-in-out infinite`,
            animationDelay: s.delay + "s",
          }}
        />
      ))}
    </div>
  );
}

function GlassCard({
  children,
  className = "",
  hoverable = false,
  accent = "blue",
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  accent?: "blue" | "orange" | "violet";
}) {
  const borderColor =
    accent === "orange"
      ? "rgba(251,146,60,0.25)"
      : accent === "violet"
      ? "rgba(167,139,250,0.25)"
      : "rgba(56,130,246,0.25)";
  const glowColor =
    accent === "orange"
      ? "rgba(251,146,60,0.05)"
      : accent === "violet"
      ? "rgba(139,92,246,0.05)"
      : "rgba(56,130,246,0.05)";

  return (
    <div
      className={`relative rounded-xl transition-all duration-300 ${
        hoverable ? "hover:scale-[1.02] group cursor-pointer" : ""
      } ${className}`}
      style={{
        background: "rgba(2, 8, 25, 0.75)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 30px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      {children}
    </div>
  );
}

function ChromeTitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "linear-gradient(180deg, #fff5e0 0%, #ffd580 20%, #ff9500 50%, #ff6a00 75%, #c94b00 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        filter: "drop-shadow(0 0 24px rgba(255,140,0,0.7)) drop-shadow(0 2px 8px rgba(0,80,255,0.5))",
        fontStyle: "italic",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <GlassCard hoverable accent="blue" className="p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className="p-2.5 rounded-lg shrink-0"
          style={{ background: "rgba(56,130,246,0.12)", border: "1px solid rgba(56,130,246,0.3)" }}
        >
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-mono text-sm font-semibold mb-1">{title}</h3>
          <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-orange-400/30 group-hover:text-orange-400 transition-all duration-300 group-hover:rotate-45 shrink-0 mt-1" />
      </div>
    </GlassCard>
  );
}

function useWebSocket(sessionId: string | null) {
  const [wsData, setWsData] = useState<{
    status: SessionStatus;
    pairingCode: string | null;
    qrCode: string | null;
    credentialsBase64: string | null;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      setWsData(null);
      return;
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
            ...prev!,
            status: prev?.status || "connecting",
            pairingCode: msg.data.code,
            qrCode: prev?.qrCode || null,
            credentialsBase64: prev?.credentialsBase64 || null,
          }));
        }
        if (msg.event === "qr") {
          setWsData((prev) => ({
            ...prev!,
            status: prev?.status || "connecting",
            pairingCode: prev?.pairingCode || null,
            qrCode: msg.data.qrCode,
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
        method,
        phoneNumber: method === "pairing" ? phoneNumber : undefined,
      });
      return (await res.json()) as SessionResponse;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      setInitialResponse(data);
      toast({ title: "Session Created", description: `Session ${data.sessionId} initialized` });
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
      setCurrentSessionId(null);
      setInitialResponse(null);
      setPhoneNumber("");
      toast({ title: "Session Terminated", description: "All session data cleaned up" });
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
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "#010208" }}>
      <style>{`
        @keyframes twinkle-star {
          0%, 100% { opacity: 0.05; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes nebula-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1) translateY(0); }
          50% { opacity: 1; transform: scale(1.08) translateY(-10px); }
        }
        @keyframes float-planet {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-12px) rotate(-5deg); }
        }
      `}</style>

      <StarField />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${spaceBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.18,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(1,2,8,0.55) 0%, rgba(1,2,12,0.4) 40%, rgba(1,2,20,0.65) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-8%",
            left: "-5%",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(56,130,246,0.22) 0%, rgba(99,60,200,0.12) 45%, transparent 70%)",
            animation: "nebula-pulse 10s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "-8%",
            width: "480px",
            height: "320px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(220,80,30,0.25) 0%, rgba(200,50,10,0.12) 50%, transparent 72%)",
            animation: "nebula-pulse 14s ease-in-out infinite reverse",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "0%",
            right: "-5%",
            width: "420px",
            height: "380px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(30,80,220,0.28) 0%, rgba(80,40,180,0.14) 50%, transparent 72%)",
            animation: "nebula-pulse 12s ease-in-out infinite 2s",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "5%",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(40,100,255,0.5) 0%, rgba(120,80,240,0.3) 40%, transparent 70%)",
            boxShadow: "0 0 60px rgba(40,100,255,0.4), 0 0 120px rgba(80,40,200,0.2)",
            animation: "float-planet 8s ease-in-out infinite 1s",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <header className="text-center mb-8 sm:mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{
              border: "1px solid rgba(255,140,0,0.3)",
              background: "rgba(255,100,0,0.08)",
              boxShadow: "0 0 20px rgba(255,100,0,0.1)",
            }}
          >
            <Bot className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono text-xs text-orange-300 tracking-widest uppercase" data-testid="text-version">
              v2.0.0-beta
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-3 tracking-tight leading-none">
            <ChromeTitle>TRUTH-MD</ChromeTitle>
          </h1>

          <p className="text-slate-400 font-mono text-sm max-w-md mx-auto leading-relaxed mt-4">
            Session ID Generator &amp; WhatsApp Linking Service
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500">
              <Shield className="w-3 h-3 text-blue-400/70" /> E2E Encrypted
            </span>
            <span className="text-slate-700">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500">
              <Zap className="w-3 h-3 text-orange-400/70" /> Real-time Sync
            </span>
            <span className="text-slate-700">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500">
              <SiWhatsapp className="w-3 h-3 text-blue-400/70" /> Multi-Device
            </span>
            <span className="text-slate-700">·</span>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, #fff5d0, #ffb340, #ff6a00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 8px rgba(255,140,0,0.5))",
              }}
            >
              ⚡ Made with WolfTech
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
          <div className="md:col-span-3 space-y-6">
            <GlassCard accent="orange" className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: "rgba(255,140,0,0.12)", border: "1px solid rgba(255,140,0,0.3)" }}
                >
                  <Terminal className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-wide">TRUTH-MD Pair</h2>
                  <p className="text-xs text-slate-500 font-mono">Initialize a new WhatsApp connection</p>
                </div>
              </div>

              <div
                className="flex gap-2 mb-6 p-1 rounded-lg"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <button
                  data-testid="button-method-pairing"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-mono text-xs transition-all ${
                    activeMethod === "pairing" ? "text-orange-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                  style={
                    activeMethod === "pairing"
                      ? { background: "rgba(255,140,0,0.12)", border: "1px solid rgba(255,140,0,0.3)" }
                      : { border: "1px solid transparent" }
                  }
                  onClick={() => setActiveMethod("pairing")}
                >
                  <Hash className="w-3.5 h-3.5" />
                  Pairing Code
                </button>
                <button
                  data-testid="button-method-qr"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-mono text-xs transition-all ${
                    activeMethod === "qr" ? "text-blue-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                  style={
                    activeMethod === "qr"
                      ? { background: "rgba(56,130,246,0.12)", border: "1px solid rgba(56,130,246,0.3)" }
                      : { border: "1px solid transparent" }
                  }
                  onClick={() => setActiveMethod("qr")}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </button>
              </div>

              {activeMethod === "pairing" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs uppercase tracking-wider font-mono mb-2">
                      Phone Number (with country code)
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        data-testid="input-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full pl-10 pr-4 py-3 rounded-lg font-mono text-sm text-white placeholder:text-slate-700 focus:outline-none transition-all"
                        style={{
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(255,140,0,0.45)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
                      />
                    </div>
                    <p className="text-slate-600 text-[10px] font-mono mt-1.5">
                      Include country code without + (e.g. 2348012345678)
                    </p>
                  </div>
                </div>
              )}

              {activeMethod === "qr" && (
                <div className="text-center py-4">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <QrCode className="w-4 h-4 text-blue-400/60" />
                    <p className="text-slate-500 text-xs font-mono">
                      QR code will be generated from WhatsApp servers
                    </p>
                  </div>
                </div>
              )}

              <button
                data-testid="button-generate"
                disabled={generateMutation.isPending || (activeMethod === "pairing" && !phoneNumber) || !!currentSessionId}
                onClick={() => generateMutation.mutate(activeMethod)}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-mono text-sm font-semibold tracking-wide transition-all hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, rgba(220,90,10,0.7) 0%, rgba(180,60,0,0.8) 100%)",
                  border: "1px solid rgba(255,140,0,0.5)",
                  color: "#ffe0b0",
                  boxShadow: "0 0 24px rgba(220,80,0,0.3), inset 0 1px 0 rgba(255,220,150,0.15)",
                }}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to WhatsApp...
                  </>
                ) : currentSessionId ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    Session Active
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Session
                  </>
                )}
              </button>
            </GlassCard>

            {currentSessionId && (
              <GlassCard accent="blue" className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: "rgba(56,130,246,0.12)", border: "1px solid rgba(56,130,246,0.3)" }}
                  >
                    <Wifi className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-mono">Active Session</h2>
                    <p className="text-xs text-slate-500 font-mono">WhatsApp connection in progress</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs uppercase tracking-wider font-mono mb-2">
                      Session ID
                    </label>
                    <div
                      className="flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-all hover:brightness-110"
                      style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.07)" }}
                      onClick={() => handleCopy(currentSessionId, "session")}
                      data-testid="button-copy-session"
                    >
                      <span className="font-mono text-sm tracking-wider truncate text-blue-300" data-testid="text-session-id">
                        {currentSessionId}
                      </span>
                      {copiedSession ? (
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {displayPairingCode && (
                    <div>
                      <label className="block text-slate-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Pairing Code (alphanumeric)
                      </label>
                      <div
                        className="flex items-center justify-between gap-3 p-4 rounded-lg cursor-pointer transition-all hover:brightness-110"
                        style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,140,0,0.3)" }}
                        onClick={() => handleCopy(displayPairingCode, "pairing")}
                        data-testid="button-copy-pairing"
                      >
                        <span
                          className="font-mono text-xl sm:text-2xl md:text-3xl tracking-[0.25em] font-black"
                          style={{
                            background: "linear-gradient(135deg, #fff5d0, #ffb340, #ff6a00)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            filter: "drop-shadow(0 0 14px rgba(255,140,0,0.6))",
                          }}
                          data-testid="text-pairing-code"
                        >
                          {formatPairingCode(displayPairingCode)}
                        </span>
                        {copiedPairing ? (
                          <Check className="w-5 h-5 text-orange-400 shrink-0" />
                        ) : (
                          <Copy className="w-5 h-5 text-slate-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 text-xs font-mono mt-2">
                        Enter this code in WhatsApp &gt; Linked Devices &gt; Link a Device
                      </p>
                    </div>
                  )}

                  {!displayPairingCode && activeMethod === "pairing" && displayStatus !== "connected" && displayStatus !== "failed" && (
                    <div
                      className="flex items-center justify-center gap-3 p-4 sm:p-6 rounded-lg"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <Loader2 className="w-5 h-5 text-orange-400 animate-spin shrink-0" />
                      <span className="text-slate-400 font-mono text-xs sm:text-sm">Requesting pairing code from WhatsApp...</span>
                    </div>
                  )}

                  {displayQrCode && (
                    <div>
                      <label className="block text-slate-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Scan QR Code with WhatsApp
                      </label>
                      <div className="flex justify-center p-6 bg-white rounded-lg">
                        <img src={displayQrCode} alt="WhatsApp QR Code" className="w-48 h-48 sm:w-56 sm:h-56" data-testid="img-qr-code" />
                      </div>
                      <p className="text-slate-600 text-xs font-mono mt-2 text-center">
                        Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Scan QR
                      </p>
                    </div>
                  )}

                  {!displayQrCode && activeMethod === "qr" && displayStatus !== "connected" && displayStatus !== "failed" && (
                    <div
                      className="flex items-center justify-center gap-3 p-4 sm:p-6 rounded-lg"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                      <span className="text-slate-400 font-mono text-xs sm:text-sm">Generating QR code from WhatsApp servers...</span>
                    </div>
                  )}

                  {displayStatus === "connected" && displayCredentials && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-slate-400 text-xs uppercase tracking-wider font-mono">
                          Session Credentials
                        </label>
                        <button
                          data-testid="button-copy-credentials"
                          onClick={() => handleCopy(sessionString, "creds")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all hover:brightness-110"
                          style={{
                            background: "rgba(255,140,0,0.12)",
                            border: "1px solid rgba(255,140,0,0.35)",
                            color: "#ffcc80",
                          }}
                        >
                          {copiedCreds ? (
                            <><Check className="w-3.5 h-3.5" /> Copied!</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy Session ID</>
                          )}
                        </button>
                      </div>
                      <div
                        className="p-3 rounded-lg cursor-pointer transition-all hover:brightness-110"
                        style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,140,0,0.2)" }}
                        onClick={() => handleCopy(sessionString, "creds")}
                        data-testid="div-credentials"
                      >
                        <code
                          className="font-mono text-xs break-all leading-relaxed"
                          style={{ color: "rgba(255,180,80,0.9)" }}
                          data-testid="text-credentials"
                        >
                          {sessionString}
                        </code>
                      </div>
                      <p className="text-slate-600 text-[10px] font-mono mt-2">
                        Your session ID has also been sent to your WhatsApp DM. Keep it private.
                      </p>
                    </div>
                  )}

                  {displayStatus === "failed" && (
                    <div
                      className="flex items-center gap-3 p-4 rounded-lg"
                      style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)" }}
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <p className="text-red-400 font-mono text-sm font-medium">Connection Failed</p>
                        <p className="text-red-400/60 font-mono text-xs mt-0.5">Terminate and try again with a valid number</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 flex-wrap">
                  <button
                    data-testid="button-terminate"
                    onClick={() => terminateMutation.mutate()}
                    disabled={terminateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-xs text-red-300 transition-all hover:brightness-110"
                    style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)" }}
                  >
                    {terminateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Terminate Session
                  </button>
                </div>
              </GlassCard>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            <GlassCard accent="violet" className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  <Link2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-mono">Quick Links</h2>
                  <p className="text-xs text-slate-500 font-mono">Resources &amp; Deploy</p>
                </div>
              </div>
              <div className="space-y-3">
                <a
                  href="https://github.com/Courtney250/TRUTH-MD.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-200 group cursor-pointer hover:brightness-110"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
                  data-testid="link-github-repo"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(56,130,246,0.12)" }}>
                    <SiGithub className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-mono font-medium">Github Repo</p>
                    <p className="text-slate-500 text-[10px] font-mono truncate">Courtney250/TRUTH-MD</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
                </a>
                <a
                  href="https://inspiring-genie-ebae09.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all duration-200 group cursor-pointer hover:brightness-110"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
                  data-testid="link-deploy-truth-md"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,140,0,0.1)" }}>
                    <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-mono font-medium">Deploy TRUTH-MD</p>
                    <p className="text-slate-500 text-[10px] font-mono truncate">inspiring-genie-ebae09.netlify.app</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors shrink-0" />
                </a>
              </div>
            </GlassCard>

            <div className="space-y-3">
              <FeatureCard icon={Shield} title="End-to-End Encrypted" desc="All session data is encrypted and secure" />
              <FeatureCard icon={Zap} title="Instant Generation" desc="Real WhatsApp server connections" />
              <FeatureCard icon={SiWhatsapp} title="WhatsApp Multi-Device" desc="Compatible with multi-device linking" />
            </div>

            <GlassCard accent="orange" className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-orange-400/80" />
                <span className="text-xs font-mono text-orange-400/80 uppercase tracking-wider">Notice</span>
              </div>
              <p className="text-slate-400 text-xs font-mono leading-relaxed">
                This tool connects to real WhatsApp servers via Baileys. Keep your session ID private. Sessions auto-expire after 5 minutes of inactivity.
              </p>
            </GlassCard>
          </div>
        </div>

        <footer
          className="mt-10 sm:mt-16 text-center pt-6 sm:pt-8 pb-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-orange-500/40" />
            <span className="font-mono text-xs text-slate-600">TRUTH-MD Pair · Built with security in mind</span>
          </div>
          <p className="text-slate-700 text-[10px] font-mono mb-5">
            All connections are end-to-end encrypted.
          </p>

          <div
            className="inline-flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl select-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,140,0,0.08) 0%, rgba(180,60,0,0.12) 100%)",
              border: "1px solid rgba(255,140,0,0.25)",
              boxShadow: "0 0 30px rgba(255,100,0,0.1), inset 0 1px 0 rgba(255,220,150,0.06)",
            }}
          >
            <span
              className="font-mono text-base font-black tracking-widest uppercase"
              style={{
                background: "linear-gradient(135deg, #fff5d0 0%, #ffd580 25%, #ff9500 55%, #ff6a00 80%, #c94b00 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 12px rgba(255,140,0,0.7)) drop-shadow(0 1px 4px rgba(0,50,200,0.4))",
                letterSpacing: "0.12em",
              }}
            >
              ⚡ Made with WolfTech ⚡
            </span>
            <span className="text-[9px] font-mono text-orange-400/50 tracking-[0.2em] uppercase">
              Powered by WolfTech · All Rights Reserved
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

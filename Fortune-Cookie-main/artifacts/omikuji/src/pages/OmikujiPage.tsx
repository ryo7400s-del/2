import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  usePublicClient,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseEventLogs, formatEther } from "viem";
import { injected } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";
import { base } from "wagmi/chains";
import {
  CONTRACT_ADDRESS,
  OMIKUJI_ABI,
  PRICE,
  FORTUNE_DATA,
} from "@/lib/contract";

type Phase = "idle" | "connecting" | "shaking" | "waiting" | "revealing" | "done";

interface Fortune {
  raw: string;
  japanese: string;
  kanji: string;
  color: string;
  glow: string;
  description: string;
}

const SAKURA_COUNT = 18;

function SakuraPetal({ index }: { index: number }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${(index * 5.5 + Math.sin(index) * 10) % 100}%`,
    top: `-20px`,
    width: `${8 + (index % 5) * 3}px`,
    height: `${8 + (index % 5) * 3}px`,
    opacity: 0.4 + (index % 3) * 0.15,
    animation: `sakuraFall ${6 + (index % 5) * 2}s linear ${(index * 0.8) % 8}s infinite`,
    pointerEvents: "none",
    zIndex: 0,
  };

  return (
    <div style={style}>
      <svg viewBox="0 0 20 20" fill="rgba(255,182,193,0.7)">
        <ellipse cx="10" cy="10" rx="5" ry="9" transform={`rotate(${index * 36} 10 10)`} />
        <ellipse cx="10" cy="10" rx="5" ry="9" transform={`rotate(${index * 36 + 72} 10 10)`} />
        <ellipse cx="10" cy="10" rx="5" ry="9" transform={`rotate(${index * 36 + 144} 10 10)`} />
        <ellipse cx="10" cy="10" rx="5" ry="9" transform={`rotate(${index * 36 + 216} 10 10)`} />
        <ellipse cx="10" cy="10" rx="5" ry="9" transform={`rotate(${index * 36 + 288} 10 10)`} />
      </svg>
    </div>
  );
}

function OmikujiBox({ phase }: { phase: Phase }) {
  return (
    <div
      className={`relative flex items-center justify-center ${
        phase === "shaking" ? "shake-animation" : "float-animation"
      }`}
      style={{ width: 120, height: 160 }}
    >
      <svg width="120" height="160" viewBox="0 0 120 160" fill="none">
        <rect x="10" y="30" width="100" height="120" rx="8" fill="#2D1B4E" stroke="#8B3A3A" strokeWidth="2" />
        <rect x="5" y="18" width="110" height="20" rx="6" fill="#3D1F5E" stroke="#C1292E" strokeWidth="2" />
        <ellipse cx="60" cy="18" rx="18" ry="7" fill="#1A0F2E" stroke="#8B3A3A" strokeWidth="1.5" />
        <line x1="10" y1="60" x2="110" y2="60" stroke="#8B3A3A" strokeWidth="0.5" opacity="0.5" />
        <line x1="10" y1="90" x2="110" y2="90" stroke="#8B3A3A" strokeWidth="0.5" opacity="0.5" />
        <line x1="10" y1="120" x2="110" y2="120" stroke="#8B3A3A" strokeWidth="0.5" opacity="0.5" />
        <text x="60" y="100" textAnchor="middle" fill="#C9A95A" fontSize="22" fontFamily="Noto Serif JP, serif" fontWeight="700">
          おみ
        </text>
        <text x="60" y="125" textAnchor="middle" fill="#C9A95A" fontSize="22" fontFamily="Noto Serif JP, serif" fontWeight="700">
          くじ
        </text>
        {[46, 54, 62, 70, 74].map((x, i) => (
          <rect
            key={i}
            x={x}
            y={-2 + i * 1.5}
            width="4"
            height={22 - i * 1.5}
            rx="2"
            fill="#D4A574"
            stroke="#A07040"
            strokeWidth="0.5"
          />
        ))}
      </svg>
    </div>
  );
}

function FortuneScroll({ fortune, visible }: { fortune: Fortune | null; visible: boolean }) {
  if (!fortune) return null;

  return (
    <div
      className={`relative mx-auto ${visible ? "scroll-unfurl" : "opacity-0"}`}
      style={{
        maxWidth: 380,
        background: "linear-gradient(180deg, #F5E6C8 0%, #EDD9A3 40%, #F5E6C8 100%)",
        borderRadius: "4px 4px 12px 12px",
        boxShadow: `0 0 40px ${fortune.glow}, 0 20px 60px rgba(0,0,0,0.5)`,
        padding: "0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 24,
          background: "linear-gradient(180deg, #C8A86B 0%, #A07840 50%, #C8A86B 100%)",
          borderRadius: "4px 4px 0 0",
        }}
      />
      <div style={{ padding: "28px 32px 32px", background: "linear-gradient(180deg, #F5E6C8 0%, #EDD9A3 100%)" }}>
        <div
          style={{
            borderBottom: "2px solid rgba(139,58,58,0.3)",
            marginBottom: 20,
            paddingBottom: 12,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Noto Serif JP, serif",
              fontSize: 11,
              color: "#6B4226",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            御神籤 Omikuji
          </span>
        </div>
        <div className="text-center" style={{ marginBottom: 8 }}>
          <span
            style={{
              fontFamily: "Noto Serif JP, serif",
              fontSize: 88,
              fontWeight: 900,
              color: fortune.color,
              lineHeight: 1,
              display: "block",
              textShadow: `0 0 30px ${fortune.glow}`,
            }}
          >
            {fortune.kanji}
          </span>
        </div>
        <div className="text-center" style={{ marginBottom: 6 }}>
          <span
            style={{
              fontFamily: "Noto Serif JP, serif",
              fontSize: 28,
              fontWeight: 700,
              color: fortune.color,
              letterSpacing: "0.15em",
            }}
          >
            {fortune.japanese}
          </span>
        </div>
        <div className="text-center" style={{ marginBottom: 20 }}>
          <span
            style={{
              fontFamily: "Noto Serif JP, serif",
              fontSize: 13,
              color: "#6B4226",
              letterSpacing: "0.1em",
              fontStyle: "italic",
            }}
          >
            {fortune.raw}
          </span>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(139,58,58,0.2)",
            borderBottom: "1px solid rgba(139,58,58,0.2)",
            padding: "14px 0",
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontFamily: "Noto Serif JP, serif",
              fontSize: 13,
              color: "#4A2C0A",
              textAlign: "center",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {fortune.description}
          </p>
        </div>
        <div className="text-center">
          <span style={{ color: "#C1292E", fontSize: 20, letterSpacing: "0.3em" }}>❋ ❋ ❋</span>
        </div>
      </div>
      <div
        style={{
          height: 24,
          background: "linear-gradient(180deg, #C8A86B 0%, #A07840 50%, #C8A86B 100%)",
          borderRadius: "0 0 12px 12px",
        }}
      />
    </div>
  );
}

export default function OmikujiPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [phase, setPhase] = useState<Phase>("idle");
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleConnect = async () => {
    setPhase("connecting");
    try {
      connect({ connector: injected() });
    } catch {
      setPhase("idle");
    }
  };

  useEffect(() => {
    if (isConnected && phase === "connecting") {
      setPhase("idle");
    }
  }, [isConnected, phase]);

  const handleDraw = async () => {
    if (!isConnected || !publicClient) return;
    if (chainId !== base.id) {
  try {
    await switchChain({ chainId: base.id });
  } catch {
    setError("Please switch to Base network.");
    return;
  }
    }
    setError(null);
    setFortune(null);
    setTxHash(null);
    setPhase("shaking");

    await new Promise((r) => setTimeout(r, 700));
    setPhase("waiting");

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: OMIKUJI_ABI,
        functionName: "draw",
        value: PRICE,
        dataSuffix: Attribution.toDataSuffix({
          codes: ["bc_p36hg37t"],
        }) as `0x${string}`,
      });

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const logs = parseEventLogs({
        abi: OMIKUJI_ABI,
        eventName: "OmikujiDrawn",
        logs: receipt.logs,
      });

      const resultStr = logs[0]?.args?.result as string | undefined;

      if (!resultStr) {
        throw new Error("Could not read fortune result from transaction.");
      }

      const data = FORTUNE_DATA[resultStr] ?? {
        japanese: resultStr,
        kanji: "��",
        color: "#FFD700",
        glow: "rgba(255,215,0,0.4)",
        description: resultStr,
      };

      const f: Fortune = { raw: resultStr, ...data };

      setPhase("revealing");
      setFortune(f);

      await new Promise((r) => setTimeout(r, 200));
      setPhase("done");
    } catch (err: unknown) {
      setPhase("idle");
      const msg =
        err instanceof Error ? err.message : "Transaction failed. Please try again.";
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        setError("Transaction cancelled.");
      } else if (msg.includes("insufficient funds")) {
        setError("Insufficient funds to pay for the draw.");
      } else {
        setError(msg.slice(0, 120));
      }
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setFortune(null);
    setError(null);
    setTxHash(null);
  };

  const priceEth = formatEther(PRICE);
  const shortAddress = address
    ? `${address.slice(0, 6)}${address.slice(-4)}`
    : "";

  const isLoading = phase === "waiting";
  const isDone = phase === "done";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% 0%, #1e0a2e 0%, #0d0818 40%, #0a0613 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: SAKURA_COUNT }, (_, i) => (
          <SakuraPetal key={i} index={i} />
        ))}
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(180,100,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(180,100,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ width: 2, height: 80, background: "linear-gradient(180deg, #C1292E 0%, transparent 100%)" }}
      />
      <div className="relative z-10 text-center mb-6 px-4">
        <div style={{ marginBottom: 4 }}>
          <span
            style={{
              fontFamily: "Noto Serif JP, serif",
              fontSize: 11,
              letterSpacing: "0.4em",
              color: "rgba(193,41,46,0.8)",
              textTransform: "uppercase",
            }}
          >
            Blockchain Fortune 0.00002 ETH
          </span>
        </div>
        <h1
          style={{
            fontFamily: "Noto Serif JP, serif",
            fontSize: "clamp(48px, 10vw, 72px)",
            fontWeight: 900,
            color: "#F5E6C8",
            lineHeight: 1,
            letterSpacing: "0.05em",
            textShadow: "0 0 40px rgba(201,169,90,0.4), 0 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          おみくじ
        </h1>
        <p
          style={{
            fontFamily: "Noto Serif JP, serif",
            fontSize: 14,
            color: "rgba(245,230,200,0.5)",
            marginTop: 8,
            letterSpacing: "0.2em",
          }}
        >
          Draw your fortune from the blockchain shrine
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 w-full max-w-md">
        {!isDone && (
          <div
            style={{
              filter: phase === "waiting" ? "brightness(0.6)" : "brightness(1)",
              transition: "filter 0.3s",
            }}
          >
            <OmikujiBox phase={phase} />
          </div>
        )}

        {(phase === "revealing" || isDone) && fortune && (
          <FortuneScroll fortune={fortune} visible={true} />
        )}

        {isLoading && (
          <div className="text-center">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTop: "2px solid #C9A95A",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "Noto Serif JP, serif",
                  fontSize: 13,
                  color: "rgba(245,230,200,0.7)",
                }}
              >
                Consulting the oracle
              </span>
            </div>
            {txHash && (
              <p style={{ fontSize: 11, color: "rgba(245,230,200,0.3)", marginTop: 8, wordBreak: "break-all" }}>
                tx: {txHash.slice(0, 20)}
              </p>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              background: "rgba(193,41,46,0.15)",
              border: "1px solid rgba(193,41,46,0.4)",
              maxWidth: 380,
              width: "100%",
            }}
          >
            <p style={{ fontSize: 13, color: "#F87171", textAlign: "center", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {!isConnected && phase !== "connecting" && (
          <button
            onClick={handleConnect}
            style={{
              padding: "14px 40px",
              background: "linear-gradient(135deg, #C1292E 0%, #8B1A1A 100%)",
              border: "1px solid rgba(255,100,100,0.3)",
              borderRadius: 8,
              color: "#F5E6C8",
              fontFamily: "Noto Serif JP, serif",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.1em",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(193,41,46,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
              transition: "all 0.2s",
            }}
          >
            Connect Wallet
          </button>
        )}

        {isConnected && !isDone && !isLoading && (
          <div className="flex flex-col items-center gap-3" style={{ width: "100%" }}>
            <button
              onClick={handleDraw}
              disabled={phase === "shaking"}
              style={{
                padding: "16px 48px",
                background:
                  phase === "shaking"
                    ? "rgba(193,41,46,0.5)"
                    : "linear-gradient(135deg, #C1292E 0%, #8B1A1A 100%)",
                border: "1px solid rgba(255,100,100,0.3)",
                borderRadius: 8,
                color: "#F5E6C8",
                fontFamily: "Noto Serif JP, serif",
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: phase === "shaking" ? "not-allowed" : "pointer",
                boxShadow:
                  "0 4px 20px rgba(193,41,46,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                transition: "all 0.2s",
                width: "100%",
                maxWidth: 320,
              }}
            >
              {phase === "shaking" ? "Shaking the oracle..." : `Draw Fortune · ${priceEth} ETH`}
            </button>

            <p
              style={{
                fontSize: 11,
                color: "rgba(245,230,200,0.35)",
                fontFamily: "Noto Serif JP, serif",
                textAlign: "center",
              }}
            >
              Connected: {shortAddress}
              <span
                style={{ marginLeft: 8, color: "rgba(193,41,46,0.6)", cursor: "pointer" }}
                onClick={() => disconnect()}
              >
                disconnect
              </span>
            </p>
          </div>
        )}

        {isDone && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <button
              onClick={handleReset}
              style={{
                padding: "12px 36px",
                background: "transparent",
                border: "1px solid rgba(245,230,200,0.25)",
                borderRadius: 8,
                color: "rgba(245,230,200,0.7)",
                fontFamily: "Noto Serif JP, serif",
                fontSize: 14,
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Draw Again
            </button>
            <p style={{ fontSize: 11, color: "rgba(245,230,200,0.3)", fontFamily: "Noto Serif JP, serif" }}>
              Connected: {shortAddress}
              <span
                style={{ marginLeft: 8, color: "rgba(193,41,46,0.6)", cursor: "pointer" }}
                onClick={() => disconnect()}
              >
                disconnect
              </span>
            </p>
          </div>
        )}

        {phase === "idle" && isConnected && (
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {Object.entries(FORTUNE_DATA).map(([key, val]) => (
              <span
                key={key}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  border: `1px solid ${val.color}40`,
                  color: val.color,
                  fontSize: 12,
                  fontFamily: "Noto Serif JP, serif",
                }}
              >
                {val.kanji}
              </span>
            ))}
          </div>
        )}

        <p
          style={{
            fontSize: 10,
            color: "rgba(245,230,200,0.2)",
            fontFamily: "Noto Serif JP, serif",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Contract · {CONTRACT_ADDRESS.slice(0, 10)}{CONTRACT_ADDRESS.slice(-8)}
        </p>
      </div>
    </div>
  );
  }

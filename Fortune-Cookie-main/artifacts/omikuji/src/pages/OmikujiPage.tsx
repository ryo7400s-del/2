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

type Phase =
  | "idle"
  | "connecting"
  | "shaking"
  | "waiting"
  | "revealing"
  | "done";

interface Fortune {
  raw: string;
  japanese: string;
  kanji: string;
  color: string;
  glow: string;
  description: string;
}

const SAKURA_COUNT = 18;

// ================= FIREWORKS =================
function Fireworks({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 80,
        }}
      >
        🎊
      </div>
    </div>
  );
}

// ================= SAKURA =================
function SakuraPetal({ index }: { index: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${(index * 7) % 100}%`,
        top: "-20px",
        width: 10,
        height: 10,
        background: "pink",
        borderRadius: "50%",
        opacity: 0.4,
      }}
    />
  );
}

// ================= OMikuji BOX =================
function OmikujiBox({ phase }: { phase: Phase }) {
  return (
    <div
      style={{
        width: 120,
        height: 160,
        border: "2px solid #C1292E",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F5E6C8",
      }}
    >
      おみくじ
    </div>
  );
}

// ================= SCROLL =================
function FortuneScroll({ fortune }: { fortune: Fortune }) {
  return (
    <div
      style={{
        maxWidth: 360,
        background: "#F5E6C8",
        padding: 20,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 64, textAlign: "center" }}>
        {fortune.kanji}
      </div>
      <div style={{ textAlign: "center" }}>{fortune.japanese}</div>
      <p style={{ fontSize: 12, textAlign: "center" }}>
        {fortune.description}
      </p>
    </div>
  );
}

// ================= MAIN =================
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
  const [showFireworks, setShowFireworks] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);

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
      await switchChain({ chainId: base.id });
    }

    setPhase("shaking");

    await new Promise((r) => setTimeout(r, 800));

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

      const resultStr = logs[0]?.args?.result as string;

      const data =
        FORTUNE_DATA[resultStr] ?? {
          japanese: resultStr,
          kanji: "吉",
          color: "#FFD700",
          glow: "rgba(255,215,0,0.4)",
          description: resultStr,
        };

      const f: Fortune = { raw: resultStr, ...data };

      setFortune(f);
      setPhase("revealing");

      if (resultStr.includes("Daikichi")) {
        setShowFireworks(true);
        setTimeout(() => setShowFireworks(false), 4000);
        setShowMintModal(true);
      }

      setTimeout(() => setPhase("done"), 300);
    } catch (err: any) {
      setPhase("idle");
      setError(err?.message ?? "error");
    }
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const priceEth = formatEther(PRICE);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0818",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Fireworks active={showFireworks} />

      {Array.from({ length: SAKURA_COUNT }).map((_, i) => (
        <SakuraPetal key={i} index={i} />
      ))}

      <h1 style={{ fontSize: 48 }}>おみくじ</h1>

      {!isConnected && (
        <button onClick={handleConnect} style={{ padding: 12 }}>
          Connect Wallet
        </button>
      )}

      {isConnected && (
        <button onClick={handleDraw} style={{ padding: 16 }}>
          Draw · {priceEth} ETH
        </button>
      )}

      {fortune && <FortuneScroll fortune={fortune} />}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* ================= NFT MODAL ================= */}
      {showMintModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "#2D1B4E", padding: 24 }}>
            <h2>大吉NFT</h2>

            <button
              onClick={() => {
                alert("準備中");
                setShowMintModal(false);
              }}
            >
              Mint
            </button>

            <button onClick={() => setShowMintModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

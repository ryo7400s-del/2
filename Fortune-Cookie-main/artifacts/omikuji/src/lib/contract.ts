import { parseAbi } from "viem";

export const CONTRACT_ADDRESS = "0x29edac435c9bb0a6ccbb11c038961d57df51c32c" as const;

export const PRICE = 20000000000000n; // 0.00002 ether in wei

export const OMIKUJI_ABI = parseAbi([
  "function draw() external payable returns (string memory result)",
  "function getPrice() external pure returns (uint256)",
  "function getContractBalance() external view returns (uint256)",
  "event OmikujiDrawn(address indexed player, string result, uint256 timestamp, uint256 paidAmount)",
]);

export type FortuneResult =
  | "Daikichi - Great Blessing"
  | "Chukichi - Middle Blessing"
  | "Shokichi - Small Blessing"
  | "Kichi - Blessing"
  | "Suekichi - Future Blessing"
  | "Kyo - Bad Luck";

export const FORTUNE_DATA: Record<
  string,
  { japanese: string; kanji: string; color: string; glow: string; description: string }
> = {
  "Daikichi - Great Blessing": {
    japanese: "大吉",
    kanji: "大",
    color: "#FFD700",
    glow: "rgba(255,215,0,0.5)",
    description: "The greatest of blessings descends upon you. Fortune smiles in all endeavors.",
  },
  "Chukichi - Middle Blessing": {
    japanese: "中吉",
    kanji: "中",
    color: "#60A5FA",
    glow: "rgba(96,165,250,0.5)",
    description: "A fine blessing awaits. Your path is clear and prospects shine brightly.",
  },
  "Shokichi - Small Blessing": {
    japanese: "小吉",
    kanji: "小",
    color: "#34D399",
    glow: "rgba(52,211,153,0.5)",
    description: "Small yet meaningful blessings grace your days. Be grateful and diligent.",
  },
  "Kichi - Blessing": {
    japanese: "吉",
    kanji: "吉",
    color: "#A78BFA",
    glow: "rgba(167,139,250,0.5)",
    description: "A gentle blessing accompanies you. Steady effort brings steady reward.",
  },
  "Suekichi - Future Blessing": {
    japanese: "末吉",
    kanji: "末",
    color: "#FB923C",
    glow: "rgba(251,146,60,0.5)",
    description: "Blessings await in the future. Patience now seeds prosperity tomorrow.",
  },
  "Kyo - Bad Luck": {
    japanese: "凶",
    kanji: "凶",
    color: "#F87171",
    glow: "rgba(248,113,113,0.5)",
    description: "Caution is wise today. Obstacles are teachers — endure with grace.",
  },
};

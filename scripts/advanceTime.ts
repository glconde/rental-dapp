import { ethers } from "hardhat";

function parseTimeArg(input: string): number {
  const match = input.trim().match(/^(-?\d+)([smhd])$/i);
  if (!match) {
    throw new Error(
      "Invalid format. Use: <number>[s|m|h|d] (e.g., 30d, -2h, 900s)"
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: { [key: string]: number } = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}

async function getCurrentBlockTime() {
  const block = await ethers.provider.getBlock("latest");
  if (!block) {
    throw new Error("Failed to fetch the latest block");
  }
  return block.timestamp;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Please provide a time offset (e.g., 30d, -2h, 900s)");
    process.exit(1);
  }

  let offsetSeconds: number;
  try {
    offsetSeconds = parseTimeArg(args[0]);
  } catch (err: any) {
    console.error("❌ " + err.message);
    process.exit(1);
  }

  const provider = ethers.provider;

  const before = await getCurrentBlockTime();
  console.log(`🕒 Current blockchain time: ${formatTimestamp(before)}`);

  await provider.send("evm_increaseTime", [offsetSeconds]);
  await provider.send("evm_mine", []);

  const after = await getCurrentBlockTime();
  console.log(`⏳ Shifted time by ${offsetSeconds} seconds`);
  console.log(`✅ New blockchain time: ${formatTimestamp(after)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

export interface Block {
  index: number;
  blockHash: string;
  prevHash: string;
  productPrevHash: string;
  productId: string;
  action: string;
  signer: string;
  payload: string;
  timestamp: number;
}

export type BlockInput = Omit<Block, "blockHash">;

/** Canonical hash of a block. blockHash itself is excluded so chains stay tamper-evident. */
export function hashBlock(b: BlockInput): string {
  const canon = [
    b.index,
    b.prevHash,
    b.productPrevHash,
    b.productId,
    b.action,
    b.signer,
    b.payload,
    b.timestamp,
  ].join("|");
  return createHash("sha256").update(canon).digest("hex");
}

export interface ChainCheck {
  valid: boolean;
  brokenAt?: number;
  reason?: string;
}

/**
 * Milestones a product's chain must contain for its current state to be legitimate.
 * Catches a chain that skipped a mandatory hand-off (defense in depth on top of the
 * server-side state machine — fires if a state was tampered with or bypassed).
 */
export function missingHandoffs(state: string, actions: string[]): string[] {
  const receives = actions.filter((a) => a === "RECEIVE").length;
  const missing: string[] = [];
  if (state === "DISTRIBUTED" && receives < 1) missing.push("distributor hand-off");
  if ((state === "AT_PHARMACY" || state === "SOLD") && receives < 2) {
    missing.push("distributor + pharmacist hand-off");
  }
  if (state === "SOLD" && !actions.includes("SELL")) missing.push("sale record");
  return missing;
}

/**
 * Validates a product's custody chain (blocks ordered by index).
 * Each block must re-hash to its stored blockHash and its productPrevHash
 * must link to the previous block in the same product's chain.
 */
export function productChainValid(blocks: Block[]): ChainCheck {
  let prev = GENESIS_HASH;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.productPrevHash !== prev) {
      return { valid: false, brokenAt: i, reason: "link_broken" };
    }
    if (hashBlock(b) !== b.blockHash) {
      return { valid: false, brokenAt: i, reason: "tampered_hash" };
    }
    prev = b.blockHash;
  }
  return { valid: true };
}

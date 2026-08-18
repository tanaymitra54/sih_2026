import { db } from "../config.js";
import { GENESIS_HASH, hashBlock, productChainValid, type Block, type BlockInput } from "./ledger-core.js";

export const ACTIONS = { MINT: "MINT", RECEIVE: "RECEIVE", VERIFY: "VERIFY", SELL: "SELL" } as const;

/** The single most recent block across all products. */
async function lastGlobalBlock(): Promise<Block | null> {
  const row = await db.custodyRecord.findFirst({ orderBy: { index: "desc" } });
  return row ? toBlock(row) : null;
}

/** The most recent block for one product. */
async function lastProductBlock(productId: string): Promise<Block | null> {
  const row = await db.custodyRecord.findFirst({
    where: { productId },
    orderBy: { index: "desc" },
  });
  return row ? toBlock(row) : null;
}

function toBlock(row: {
  index: number; blockHash: string; prevHash: string; productPrevHash: string;
  productId: string; action: string; signer: string; payload: string; timestamp: number;
}): Block {
  return {
    index: row.index, blockHash: row.blockHash, prevHash: row.prevHash,
    productPrevHash: row.productPrevHash, productId: row.productId, action: row.action,
    signer: row.signer, payload: row.payload, timestamp: row.timestamp,
  };
}

/**
 * Appends an immutable block to the ledger and persists it.
 * prevHash links to the global tip; productPrevHash links to this product's own tip.
 */
export async function appendBlock(input: Omit<BlockInput, "index" | "prevHash" | "productPrevHash" | "timestamp"> & { timestamp?: number }): Promise<Block> {
  const global = await lastGlobalBlock();
  const product = await lastProductBlock(input.productId);
  const index = (global?.index ?? 0) + 1;
  const blockInput: BlockInput = {
    ...input,
    timestamp: input.timestamp ?? Math.floor(Date.now() / 1000),
    index,
    prevHash: global?.blockHash ?? GENESIS_HASH,
    productPrevHash: product?.blockHash ?? GENESIS_HASH,
  };
  const block: Block = { ...blockInput, blockHash: hashBlock(blockInput) };
  await db.custodyRecord.create({
    data: {
      index: block.index,
      blockHash: block.blockHash,
      prevHash: block.prevHash,
      productPrevHash: block.productPrevHash,
      productId: block.productId,
      action: block.action,
      signer: block.signer,
      payload: block.payload,
      timestamp: block.timestamp,
    },
  });
  return block;
}

/** Full custody chain for a product, in order. */
export async function productBlocks(productId: string): Promise<Block[]> {
  const rows = await db.custodyRecord.findMany({
    where: { productId },
    orderBy: { index: "asc" },
  });
  return rows.map(toBlock);
}

export async function productChainIsValid(productId: string) {
  return productChainValid(await productBlocks(productId));
}

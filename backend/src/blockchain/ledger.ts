import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { db } from "../config.js";
import { GENESIS_HASH, hashBlock, productChainValid, type Block, type BlockInput } from "./ledger-core.js";

export const ACTIONS = { MINT: "MINT", RECEIVE: "RECEIVE", VERIFY: "VERIFY", SELL: "SELL" } as const;

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Serializes ledger appends so `index`/`prevHash` are computed atomically even
 * under concurrent writes (prevents duplicate indices / broken hash links).
 */
let lock: Promise<unknown> = Promise.resolve();
function withLedgerLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => {});
  return run;
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
 * Pass `tx` to run the append inside the caller's transaction.
 */
export async function appendBlock(
  input: Omit<BlockInput, "index" | "prevHash" | "productPrevHash" | "timestamp"> & { timestamp?: number },
  tx?: DbClient,
): Promise<Block> {
  return withLedgerLock(async () => {
    const client = tx ?? db;
    const global = await client.custodyRecord.findFirst({ orderBy: { index: "desc" } });
    const product = await client.custodyRecord.findFirst({
      where: { productId: input.productId },
      orderBy: { index: "desc" },
    });
    const index = (global?.index ?? 0) + 1;
    const blockInput: BlockInput = {
      ...input,
      timestamp: input.timestamp ?? Math.floor(Date.now() / 1000),
      index,
      prevHash: global?.blockHash ?? GENESIS_HASH,
      productPrevHash: product?.blockHash ?? GENESIS_HASH,
    };
    const block: Block = { ...blockInput, blockHash: hashBlock(blockInput) };
    await client.custodyRecord.create({
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
  });
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

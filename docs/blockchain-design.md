# Blockchain / Ledger Design

## What it is

A **hash-chained append-only ledger**. Blocks are persisted to SQLite
(`CustodyRecord`) but the integrity logic is pure and lives in
`backend/src/blockchain/ledger-core.ts`.

## Block anatomy

```ts
{
  index,             // global block number (1-based)
  blockHash,         // sha256 of the block
  prevHash,          // hash of the previous GLOBAL block
  productPrevHash,   // hash of the previous block for THIS product
  productId,
  action,            // MINT | RECEIVE | VERIFY | SELL
  signer,            // userId (or "public" for consumer verifies)
  payload,           // JSON: batch code / role / location / flags
  timestamp          // seconds since epoch
}
```

## Why two previous-hash pointers

- `prevHash` links every block in the DB into one chain — editing *any* block breaks
  every block after it.
- `productPrevHash` links one product's own custody record — lets us validate a single
  product's journey in isolation (what the pharmacy/consumer verification needs).

## Hash computation

```
blockHash = sha256(index | prevHash | productPrevHash | productId | action | signer | payload | timestamp)
```

`blockHash` itself is deliberately **not** part of the input, so a modified block can
never hash to its stored value.

## Integrity check (`productChainValid`)

Walk a product's blocks in order:
1. `block.productPrevHash` must equal the previous block's `blockHash` (or the 64-zero
   genesis for the first block).
2. `hashBlock(block)` must equal the stored `blockHash`.

Either failure ⇒ chain broken ⇒ the product is flagged COUNTERFEIT.

## Proven in code

`npm run selfcheck` runs `ledger-core.selfcheck.ts` and asserts:
- a valid chain passes,
- a tampered payload fails with `tampered_hash`,
- a broken link fails with `link_broken`,
- an empty chain passes (trivially valid).

## Upgrade path to a real chain (web3-ready)

The interface — `appendBlock(productId, action, signer, payload)` and
`productBlocks(productId)` — is storage-agnostic. To go live:
- replace the `db.custodyRecord` calls with contract calls (Ethereum/Hyperledger Fabric),
- keep the same block schema and `productChainValid` for off-chain sanity checks,
- swap `signSerial`'s HMAC for an asymmetric keypair (Ed25519/Ethereum account) so the
  manufacturer signs QRs with a private key and anyone can verify with the public key.

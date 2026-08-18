import assert from "node:assert";
import { GENESIS_HASH, hashBlock, productChainValid, missingHandoffs, type Block } from "./ledger-core.ts";

function makeBlock(
  index: number,
  prevHash: string,
  productPrevHash: string,
  action: string,
): Block {
  const b = { index, prevHash, productPrevHash, productId: "p1", action, signer: "u1", payload: "{}", timestamp: 1700000000000 + index };
  return { ...b, blockHash: hashBlock(b) };
}

function buildValidChain(): Block[] {
  const g1 = makeBlock(1, GENESIS_HASH, GENESIS_HASH, "MINT");
  const g2 = makeBlock(2, g1.blockHash, g1.blockHash, "RECEIVE");
  const g3 = makeBlock(3, g2.blockHash, g2.blockHash, "SELL");
  return [g1, g2, g3];
}

const valid = productChainValid(buildValidChain());
assert.ok(valid.valid, "valid chain must pass");

const tampered = buildValidChain();
tampered[1].payload = "{\"location\":\"Hacked\"}";
const tamperCheck = productChainValid(tampered);
assert.ok(!tamperCheck.valid, "tampered block must fail");
assert.equal(tamperCheck.reason, "tampered_hash");

const broken = buildValidChain();
broken[2].productPrevHash = GENESIS_HASH;
const brokenCheck = productChainValid(broken);
assert.ok(!brokenCheck.valid, "broken link must fail");
assert.equal(brokenCheck.reason, "link_broken");

const empty = productChainValid([]);
assert.ok(empty.valid, "empty chain is trivially valid");

const full = ["MINT", "RECEIVE", "RECEIVE", "SELL"];
assert.deepEqual(missingHandoffs("SOLD", full), [], "full chain has no missing hand-offs");
assert.deepEqual(missingHandoffs("SOLD", ["MINT", "RECEIVE", "RECEIVE", "BUY"]), [], "consumer-bought chain is complete");
assert.deepEqual(missingHandoffs("AT_PHARMACY", ["MINT", "RECEIVE"]), ["distributor + pharmacist hand-off"]);
assert.deepEqual(missingHandoffs("SOLD", ["MINT", "RECEIVE", "RECEIVE"]), ["sale record"]);
assert.deepEqual(missingHandoffs("CREATED", ["MINT"]), [], "CREATED needs no hand-offs yet");
assert.deepEqual(missingHandoffs("DISTRIBUTED", ["MINT"]), ["distributor hand-off"]);

console.log("selfcheck: ledger-core OK");

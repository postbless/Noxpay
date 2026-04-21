import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

describe("NoxPay contracts", () => {
  it("keeps the public escrow schema free of plaintext amount fields", () => {
    const source = readFileSync("contracts/NoxPayEscrow.sol", "utf8");
    assert.match(source, /euint256 encryptedAmount/);
    assert.doesNotMatch(source, /uint256\s+amount;/);
    assert.doesNotMatch(source, /uint256\s+paymentAmount/);
  });

  it("uses iExec Nox confidential token interfaces", () => {
    const escrow = readFileSync("contracts/NoxPayEscrow.sol", "utf8");
    const token = readFileSync("contracts/NoxPayToken.sol", "utf8");
    assert.match(escrow, /IERC7984/);
    assert.match(escrow, /externalEuint256/);
    assert.match(token, /ERC7984/);
    assert.match(token, /Nox\.fromExternal/);
  });
});

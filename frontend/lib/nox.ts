import { createViemHandleClient } from "@iexec-nox/handle";
import type { WalletClient } from "viem";

export async function encryptUint256(
  walletClient: WalletClient,
  value: bigint,
  applicationContract: `0x${string}`
) {
  const handleClient = await createViemHandleClient(walletClient);
  return handleClient.encryptInput(value, "uint256", applicationContract);
}

export async function decryptHandle(walletClient: WalletClient, handle: `0x${string}`) {
  const handleClient = await createViemHandleClient(walletClient);
  return handleClient.decrypt(handle);
}

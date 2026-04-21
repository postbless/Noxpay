import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();

  if (!deployer) {
    throw new Error(
      "Missing deployer wallet. Set PRIVATE_KEY in the repo .env file and fund it with Arbitrum Sepolia ETH."
    );
  }

  console.log(`Deploying NoxPay with ${deployer.account.address} on ${network.name}`);

  const token = await viem.deployContract("NoxPayToken", []);
  console.log(`NoxPayToken deployed to ${token.address}`);

  const escrow = await viem.deployContract("NoxPayEscrow", [token.address]);
  console.log(`NoxPayEscrow deployed to ${escrow.address}`);

  const output = {
    network: network.name,
    chainId: await deployer.getChainId(),
    deployer: deployer.account.address,
    contracts: {
      NoxPayToken: token.address,
      NoxPayEscrow: escrow.address
    },
    deployedAt: new Date().toISOString()
  };

  const outPath = path.resolve("deployments", `${network.name}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Deployment details written to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

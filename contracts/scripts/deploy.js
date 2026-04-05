const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying DocumentVault to:", hre.network.name);

    const [deployer] = await hre.ethers.getSigners();
    console.log("📬 Deploying from address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "MATIC");

    // Deploy the contract
    const DocumentVault = await hre.ethers.getContractFactory("DocumentVault");
    const vault = await DocumentVault.deploy();
    await vault.waitForDeployment();

    const address = await vault.getAddress();
    console.log("✅ DocumentVault deployed to:", address);
    console.log("🔗 Transaction hash:", vault.deploymentTransaction().hash);

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        contractAddress: address,
        deployerAddress: deployer.address,
        transactionHash: vault.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        abi: JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "../artifacts/contracts/DocumentVault.sol/DocumentVault.json"),
                "utf8"
            )
        ).abi,
    };

    // Write to deployments directory
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to:", deploymentFile);

    // Also write a simple address file for frontend/backend to consume
    const addressFile = path.join(__dirname, "../../frontend/src/contracts/deployment.json");
    const addressDir = path.dirname(addressFile);
    if (!fs.existsSync(addressDir)) {
        fs.mkdirSync(addressDir, { recursive: true });
    }
    fs.writeFileSync(
        addressFile,
        JSON.stringify(
            {
                contractAddress: address,
                network: hre.network.name,
                chainId: hre.network.config.chainId,
                deployedAt: new Date().toISOString(),
            },
            null,
            2
        )
    );
    console.log("📄 Frontend deployment info saved to:", addressFile);

    // Verify on Polygonscan (Mumbai/Mainnet only)
    if (hre.network.name === "mumbai" || hre.network.name === "polygon") {
        console.log("\n⏳ Waiting 30s before verifying on Polygonscan...");
        await new Promise((r) => setTimeout(r, 30000));
        try {
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: [],
            });
            console.log("✅ Contract verified on Polygonscan!");
        } catch (err) {
            console.warn("⚠️  Verification failed (may already be verified):", err.message);
        }
    }
}

main().catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exitCode = 1;
});

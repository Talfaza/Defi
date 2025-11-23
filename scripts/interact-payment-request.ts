import { ethers } from "hardhat";

/**
 * Example script showing how to interact with the PaymentRequest contract
 * Run with: npx hardhat run scripts/interact-payment-request.ts --network localhost
 */

async function main() {
  console.log("\n🚀 PaymentRequest Contract Interaction Example\n");

  // Get signers
  const [requester, payer, thirdParty] = await ethers.getSigners();
  
  console.log("👤 Accounts:");
  console.log(`   Requester: ${requester.address}`);
  console.log(`   Payer: ${payer.address}`);
  console.log(`   Third Party: ${thirdParty.address}\n`);

  // Deploy the contract
  console.log("📦 Deploying PaymentRequest contract...");
  const PaymentRequest = await ethers.getContractFactory("PaymentRequest");
  const paymentRequest = await PaymentRequest.deploy();
  await paymentRequest.waitForDeployment();
  const contractAddress = await paymentRequest.getAddress();
  console.log(`✅ Contract deployed at: ${contractAddress}\n`);

  // Example 1: Create a simple payment request
  console.log("=" .repeat(60));
  console.log("Example 1: Create Payment Request (No Deadline)");
  console.log("=" .repeat(60));
  
  const amount1 = ethers.parseEther("0.5"); // 0.5 ETH
  const description1 = "Payment for web development services";
  
  console.log(`📝 Creating request:`);
  console.log(`   Amount: ${ethers.formatEther(amount1)} ETH`);
  console.log(`   Description: "${description1}"`);
  
  const tx1 = await paymentRequest
    .connect(requester)
    .createRequest(payer.address, amount1, 0, description1);
  await tx1.wait();
  
  console.log(`✅ Request #0 created!\n`);

  // Get and display request details
  const request0 = await paymentRequest.getRequest(0);
  console.log(`📋 Request Details:`);
  console.log(`   ID: ${request0.id}`);
  console.log(`   Requester: ${request0.requester}`);
  console.log(`   Payer: ${request0.payer}`);
  console.log(`   Amount: ${ethers.formatEther(request0.amount)} ETH`);
  console.log(`   Status: ${getStatusName(request0.status)}`);
  console.log(`   Description: "${request0.description}"\n`);

  // Example 2: Create request with deadline
  console.log("=" .repeat(60));
  console.log("Example 2: Create Payment Request (With Deadline)");
  console.log("=" .repeat(60));
  
  const amount2 = ethers.parseEther("1.0"); // 1 ETH
  const deadline2 = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const description2 = "Invoice #12345 - Due in 24 hours";
  
  console.log(`📝 Creating request:`);
  console.log(`   Amount: ${ethers.formatEther(amount2)} ETH`);
  console.log(`   Deadline: ${new Date(deadline2 * 1000).toLocaleString()}`);
  console.log(`   Description: "${description2}"`);
  
  const tx2 = await paymentRequest
    .connect(requester)
    .createRequest(payer.address, amount2, deadline2, description2);
  await tx2.wait();
  
  console.log(`✅ Request #1 created!\n`);

  // Example 3: Pay the first request
  console.log("=" .repeat(60));
  console.log("Example 3: Pay Request");
  console.log("=" .repeat(60));
  
  const requesterBalanceBefore = await ethers.provider.getBalance(requester.address);
  const payerBalanceBefore = await ethers.provider.getBalance(payer.address);
  
  console.log(`💰 Balances before payment:`);
  console.log(`   Requester: ${ethers.formatEther(requesterBalanceBefore)} ETH`);
  console.log(`   Payer: ${ethers.formatEther(payerBalanceBefore)} ETH\n`);
  
  console.log(`💸 Paying request #0 (${ethers.formatEther(amount1)} ETH)...`);
  const tx3 = await paymentRequest
    .connect(payer)
    .payRequest(0, { value: amount1 });
  const receipt3 = await tx3.wait();
  
  console.log(`✅ Payment successful!\n`);

  const requesterBalanceAfter = await ethers.provider.getBalance(requester.address);
  const payerBalanceAfter = await ethers.provider.getBalance(payer.address);
  
  console.log(`💰 Balances after payment:`);
  console.log(`   Requester: ${ethers.formatEther(requesterBalanceAfter)} ETH (${ethers.formatEther(requesterBalanceAfter - requesterBalanceBefore)} ETH)`);
  console.log(`   Payer: ${ethers.formatEther(payerBalanceAfter)} ETH\n`);

  // Verify request status
  const request0Updated = await paymentRequest.getRequest(0);
  console.log(`📋 Updated Request #0 Status: ${getStatusName(request0Updated.status)}`);
  console.log(`   Paid at: ${new Date(Number(request0Updated.paidAt) * 1000).toLocaleString()}\n`);

  // Example 4: Cancel a request
  console.log("=" .repeat(60));
  console.log("Example 4: Cancel Request");
  console.log("=" .repeat(60));
  
  console.log(`🚫 Cancelling request #1...`);
  const tx4 = await paymentRequest.connect(requester).cancelRequest(1);
  await tx4.wait();
  
  console.log(`✅ Request #1 cancelled!\n`);

  const request1 = await paymentRequest.getRequest(1);
  console.log(`📋 Request #1 Status: ${getStatusName(request1.status)}\n`);

  // Example 5: Query requests
  console.log("=" .repeat(60));
  console.log("Example 5: Query Requests");
  console.log("=" .repeat(60));
  
  const requesterRequests = await paymentRequest.getRequesterRequests(requester.address);
  console.log(`📊 Requests created by requester: ${requesterRequests.length}`);
  for (const id of requesterRequests) {
    const req = await paymentRequest.getRequest(id);
    console.log(`   - Request #${id}: ${ethers.formatEther(req.amount)} ETH - ${getStatusName(req.status)}`);
  }
  console.log();

  const payerRequests = await paymentRequest.getPayerRequests(payer.address);
  console.log(`📊 Requests assigned to payer: ${payerRequests.length}`);
  for (const id of payerRequests) {
    const req = await paymentRequest.getRequest(id);
    console.log(`   - Request #${id}: ${ethers.formatEther(req.amount)} ETH - ${getStatusName(req.status)}`);
  }
  console.log();

  // Example 6: Overpayment scenario (will refund excess)
  console.log("=" .repeat(60));
  console.log("Example 6: Overpayment with Automatic Refund");
  console.log("=" .repeat(60));
  
  const amount3 = ethers.parseEther("0.1");
  const description3 = "Small payment request";
  
  console.log(`📝 Creating request for ${ethers.formatEther(amount3)} ETH...`);
  const tx5 = await paymentRequest
    .connect(requester)
    .createRequest(payer.address, amount3, 0, description3);
  await tx5.wait();
  console.log(`✅ Request #2 created!\n`);

  const overpayAmount = ethers.parseEther("0.2"); // Sending double
  console.log(`💸 Paying ${ethers.formatEther(overpayAmount)} ETH (${ethers.formatEther(overpayAmount - amount3)} ETH excess)...`);
  
  const payerBalanceBefore2 = await ethers.provider.getBalance(payer.address);
  const tx6 = await paymentRequest
    .connect(payer)
    .payRequest(2, { value: overpayAmount });
  const receipt6 = await tx6.wait();
  const gasUsed = receipt6!.gasUsed * receipt6!.gasPrice;
  const payerBalanceAfter2 = await ethers.provider.getBalance(payer.address);
  
  const actualCost = payerBalanceBefore2 - payerBalanceAfter2 - gasUsed;
  console.log(`✅ Payment successful!`);
  console.log(`   Excess ${ethers.formatEther(overpayAmount - amount3)} ETH automatically refunded`);
  console.log(`   Actual cost: ${ethers.formatEther(actualCost)} ETH (excluding gas)\n`);

  // Summary
  console.log("=" .repeat(60));
  console.log("📊 Final Summary");
  console.log("=" .repeat(60));
  console.log(`Total requests created: ${await paymentRequest.getNextRequestId()}`);
  console.log(`Contract address: ${contractAddress}`);
  console.log(`\n✅ All examples completed successfully!\n`);
}

function getStatusName(status: bigint): string {
  const statusMap: { [key: string]: string } = {
    "0": "Pending",
    "1": "Paid",
    "2": "Cancelled",
    "3": "Expired"
  };
  return statusMap[status.toString()] || "Unknown";
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

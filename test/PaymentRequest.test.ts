import { expect } from "chai";
import { ethers } from "hardhat";
import { PaymentRequest } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PaymentRequest", function () {
  let paymentRequest: PaymentRequest;
  let requester: SignerWithAddress;
  let payer: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  const PAYMENT_AMOUNT = ethers.parseEther("1.0"); // 1 ETH
  const DESCRIPTION = "Invoice for services rendered";

  beforeEach(async function () {
    // Get signers
    [requester, payer, otherAccount] = await ethers.getSigners();

    // Deploy the contract
    const PaymentRequestFactory = await ethers.getContractFactory("PaymentRequest");
    paymentRequest = await PaymentRequestFactory.deploy();
    await paymentRequest.waitForDeployment();
  });

  describe("Request Creation", function () {
    it("Should create a payment request successfully", async function () {
      const deadline = (await time.latest()) + 86400; // 1 day from now

      const tx = await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, deadline, DESCRIPTION);

      // Check event emission
      await expect(tx)
        .to.emit(paymentRequest, "RequestCreated")
        .withArgs(0, requester.address, payer.address, PAYMENT_AMOUNT, deadline, DESCRIPTION);

      // Verify request details
      const request = await paymentRequest.getRequest(0);
      expect(request.requester).to.equal(requester.address);
      expect(request.payer).to.equal(payer.address);
      expect(request.amount).to.equal(PAYMENT_AMOUNT);
      expect(request.deadline).to.equal(deadline);
      expect(request.status).to.equal(0); // Pending
      expect(request.description).to.equal(DESCRIPTION);
    });

    it("Should create request without deadline", async function () {
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, DESCRIPTION);

      const request = await paymentRequest.getRequest(0);
      expect(request.deadline).to.equal(0);
    });

    it("Should fail with invalid payer address", async function () {
      await expect(
        paymentRequest
          .connect(requester)
          .createRequest(ethers.ZeroAddress, PAYMENT_AMOUNT, 0, DESCRIPTION)
      ).to.be.revertedWithCustomError(paymentRequest, "InvalidPayer");
    });

    it("Should fail with zero amount", async function () {
      await expect(
        paymentRequest
          .connect(requester)
          .createRequest(payer.address, 0, 0, DESCRIPTION)
      ).to.be.revertedWithCustomError(paymentRequest, "InvalidAmount");
    });

    it("Should fail with past deadline", async function () {
      const pastDeadline = (await time.latest()) - 3600; // 1 hour ago

      await expect(
        paymentRequest
          .connect(requester)
          .createRequest(payer.address, PAYMENT_AMOUNT, pastDeadline, DESCRIPTION)
      ).to.be.revertedWithCustomError(paymentRequest, "RequestExpired");
    });

    it("Should track multiple requests per user", async function () {
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, "Request 1");
      
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, "Request 2");

      const requesterRequests = await paymentRequest.getRequesterRequests(requester.address);
      expect(requesterRequests.length).to.equal(2);

      const payerRequests = await paymentRequest.getPayerRequests(payer.address);
      expect(payerRequests.length).to.equal(2);
    });
  });

  describe("Payment Processing", function () {
    beforeEach(async function () {
      // Create a request before each test
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, DESCRIPTION);
    });

    it("Should allow payer to pay the exact amount", async function () {
      const requesterBalanceBefore = await ethers.provider.getBalance(requester.address);

      const tx = await paymentRequest
        .connect(payer)
        .payRequest(0, { value: PAYMENT_AMOUNT });

      await expect(tx)
        .to.emit(paymentRequest, "RequestPaid")
        .withArgs(0, payer.address, PAYMENT_AMOUNT, await time.latest());

      // Check request status
      const request = await paymentRequest.getRequest(0);
      expect(request.status).to.equal(1); // Paid
      expect(request.paidAt).to.be.greaterThan(0);

      // Check requester received payment
      const requesterBalanceAfter = await ethers.provider.getBalance(requester.address);
      expect(requesterBalanceAfter - requesterBalanceBefore).to.equal(PAYMENT_AMOUNT);
    });

    it("Should refund excess payment", async function () {
      const excessAmount = ethers.parseEther("0.5");
      const totalSent = PAYMENT_AMOUNT + excessAmount;

      const payerBalanceBefore = await ethers.provider.getBalance(payer.address);

      const tx = await paymentRequest
        .connect(payer)
        .payRequest(0, { value: totalSent });

      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const payerBalanceAfter = await ethers.provider.getBalance(payer.address);
      
      // Payer should only lose the requested amount + gas
      expect(payerBalanceBefore - payerBalanceAfter).to.be.closeTo(
        PAYMENT_AMOUNT + gasUsed,
        ethers.parseEther("0.001") // Small tolerance for gas variations
      );
    });

    it("Should fail if non-payer tries to pay", async function () {
      await expect(
        paymentRequest
          .connect(otherAccount)
          .payRequest(0, { value: PAYMENT_AMOUNT })
      ).to.be.revertedWithCustomError(paymentRequest, "Unauthorized");
    });

    it("Should fail with insufficient payment", async function () {
      const insufficientAmount = ethers.parseEther("0.5");

      await expect(
        paymentRequest
          .connect(payer)
          .payRequest(0, { value: insufficientAmount })
      ).to.be.revertedWithCustomError(paymentRequest, "InsufficientPayment");
    });

    it("Should fail to pay already paid request", async function () {
      // Pay once
      await paymentRequest
        .connect(payer)
        .payRequest(0, { value: PAYMENT_AMOUNT });

      // Try to pay again
      await expect(
        paymentRequest
          .connect(payer)
          .payRequest(0, { value: PAYMENT_AMOUNT })
      ).to.be.revertedWithCustomError(paymentRequest, "AlreadyPaid");
    });

    it("Should fail to pay cancelled request", async function () {
      // Cancel the request
      await paymentRequest.connect(requester).cancelRequest(0);

      // Try to pay
      await expect(
        paymentRequest
          .connect(payer)
          .payRequest(0, { value: PAYMENT_AMOUNT })
      ).to.be.revertedWithCustomError(paymentRequest, "AlreadyCancelled");
    });

    it("Should fail to pay expired request", async function () {
      // Create request with 1 hour deadline
      const deadline = (await time.latest()) + 3600;
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, deadline, DESCRIPTION);

      // Fast forward past deadline
      await time.increase(3601);

      // Try to pay
      await expect(
        paymentRequest
          .connect(payer)
          .payRequest(1, { value: PAYMENT_AMOUNT })
      ).to.be.revertedWithCustomError(paymentRequest, "RequestExpired");
    });

    it("Should fail for non-existent request", async function () {
      await expect(
        paymentRequest
          .connect(payer)
          .payRequest(999, { value: PAYMENT_AMOUNT })
      ).to.be.revertedWithCustomError(paymentRequest, "RequestNotFound");
    });
  });

  describe("Request Cancellation", function () {
    beforeEach(async function () {
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, DESCRIPTION);
    });

    it("Should allow requester to cancel pending request", async function () {
      const tx = await paymentRequest.connect(requester).cancelRequest(0);

      await expect(tx)
        .to.emit(paymentRequest, "RequestCancelled")
        .withArgs(0, requester.address, await time.latest());

      const request = await paymentRequest.getRequest(0);
      expect(request.status).to.equal(2); // Cancelled
    });

    it("Should fail if non-requester tries to cancel", async function () {
      await expect(
        paymentRequest.connect(payer).cancelRequest(0)
      ).to.be.revertedWithCustomError(paymentRequest, "Unauthorized");
    });

    it("Should fail to cancel already paid request", async function () {
      await paymentRequest
        .connect(payer)
        .payRequest(0, { value: PAYMENT_AMOUNT });

      await expect(
        paymentRequest.connect(requester).cancelRequest(0)
      ).to.be.revertedWithCustomError(paymentRequest, "AlreadyPaid");
    });

    it("Should fail to cancel already cancelled request", async function () {
      await paymentRequest.connect(requester).cancelRequest(0);

      await expect(
        paymentRequest.connect(requester).cancelRequest(0)
      ).to.be.revertedWithCustomError(paymentRequest, "AlreadyCancelled");
    });
  });

  describe("View Functions", function () {
    it("Should return correct requester requests", async function () {
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, "Request 1");
      
      await paymentRequest
        .connect(requester)
        .createRequest(otherAccount.address, PAYMENT_AMOUNT, 0, "Request 2");

      const requests = await paymentRequest.getRequesterRequests(requester.address);
      expect(requests.length).to.equal(2);
      expect(requests[0]).to.equal(0);
      expect(requests[1]).to.equal(1);
    });

    it("Should return correct payer requests", async function () {
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, "Request 1");
      
      await paymentRequest
        .connect(otherAccount)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, "Request 2");

      const requests = await paymentRequest.getPayerRequests(payer.address);
      expect(requests.length).to.equal(2);
    });

    it("Should correctly identify expired requests", async function () {
      const deadline = (await time.latest()) + 3600;
      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, deadline, DESCRIPTION);

      // Not expired yet
      expect(await paymentRequest.isExpired(0)).to.equal(false);

      // Fast forward past deadline
      await time.increase(3601);

      // Now expired
      expect(await paymentRequest.isExpired(0)).to.equal(true);
    });

    it("Should return next request ID", async function () {
      expect(await paymentRequest.getNextRequestId()).to.equal(0);

      await paymentRequest
        .connect(requester)
        .createRequest(payer.address, PAYMENT_AMOUNT, 0, DESCRIPTION);

      expect(await paymentRequest.getNextRequestId()).to.equal(1);
    });
  });
});

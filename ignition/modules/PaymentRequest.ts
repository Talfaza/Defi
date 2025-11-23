import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PaymentRequestModule = buildModule("PaymentRequestModule", (m) => {
  const paymentRequest = m.contract("PaymentRequest");

  return { paymentRequest };
});

export default PaymentRequestModule;

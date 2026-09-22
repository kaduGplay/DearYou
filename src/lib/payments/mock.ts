import { nanoid } from "nanoid";
import type { PaymentProvider } from "./index";

/** Provedor simulado: gera um "PIX" fake e permite confirmar manualmente em dev. */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createPix({ orderId, amountCents }) {
    return {
      providerRef: `mock_${nanoid(12)}`,
      pixCode: `00020126MOCK${orderId.slice(-8)}5204000053039865406${(amountCents / 100).toFixed(2)}5802BR6304${nanoid(4).toUpperCase()}`,
    };
  },
  async getStatus() {
    return "pending";
  },
};

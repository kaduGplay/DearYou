"use client";
import { useEffect } from "react";
import { trackPurchase, type Purchase } from "@/lib/meta-pixel";

/** Recebe apenas pedidos pagos, consultados pelo servidor para o usuário autenticado. */
export default function PurchaseEvents({ orders }: { orders: Purchase[] }) {
  useEffect(() => { orders.forEach(trackPurchase); }, [orders]);
  return null;
}

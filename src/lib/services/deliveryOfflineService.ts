"use client";

export type OfflineDeliveryConfirmation = {
  id: string;
  routeId: string;
  stopId: string;
  photoUrl: string;
  signature?: string;
  notes?: string;
  createdAt: string;
};

const KEY = "delivery_offline_confirmations";

const readQueue = (): OfflineDeliveryConfirmation[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OfflineDeliveryConfirmation[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: OfflineDeliveryConfirmation[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(queue));
};

export const getOfflineConfirmations = () => readQueue();

export const enqueueOfflineConfirmation = (
  payload: Omit<OfflineDeliveryConfirmation, "id" | "createdAt">
) => {
  const queue = readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...payload,
  });
  writeQueue(queue);
  return queue.length;
};

export const removeOfflineConfirmation = (id: string) => {
  const queue = readQueue().filter((item) => item.id !== id);
  writeQueue(queue);
  return queue.length;
};

export const clearOfflineConfirmations = () => {
  writeQueue([]);
};

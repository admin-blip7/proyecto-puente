"use client";

export const canUsePush = () =>
  typeof window !== "undefined" && "Notification" in window;

export const requestPushPermission = async (): Promise<NotificationPermission | "unsupported"> => {
  if (!canUsePush()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
};

export const notifyRouteAssigned = async (routeCode: string) => {
  const permission = await requestPushPermission();
  if (permission !== "granted") return false;
  new Notification("Nueva ruta asignada", {
    body: `Tienes asignada la ruta ${routeCode}`,
    tag: `route-${routeCode}`,
  });
  return true;
};

export const notifyRouteUpdate = async (message: string) => {
  const permission = await requestPushPermission();
  if (permission !== "granted") return false;
  new Notification("Actualización de ruta", {
    body: message,
    tag: "route-update",
  });
  return true;
};

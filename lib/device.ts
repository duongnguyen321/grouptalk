"use client";

import { DEVICE_ID_STORAGE_KEY } from "@/lib/constants";

function syncCookie(deviceId: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${DEVICE_ID_STORAGE_KEY}=${deviceId}; path=/; max-age=31536000; SameSite=Lax`;
}

export function getDeviceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const id = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (id) {
    syncCookie(id);
  }
  return id;
}

export function getOrCreateDeviceId(): string {
  const existing = getDeviceId();
  if (existing) {
    syncCookie(existing);
    return existing;
  }

  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  syncCookie(deviceId);
  return deviceId;
}


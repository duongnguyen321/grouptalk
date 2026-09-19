"use client";

import { DEVICE_ID_STORAGE_KEY } from "@/lib/constants";

export function getDeviceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
}

export function getOrCreateDeviceId(): string {
  const existing = getDeviceId();
  if (existing) {
    return existing;
  }

  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}

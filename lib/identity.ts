import { cookies } from "next/headers";
import { AuthType } from "@/generated/prisma/enums";
import type { User } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { ANONYMOUS_DISPLAY_NAME, DEVICE_ID_STORAGE_KEY } from "@/lib/constants";
import { prisma } from "@/lib/db";

export async function resolveGuestUser(deviceId: string): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { deviceId },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      authType: AuthType.DEVICE,
      deviceId,
    },
  });
}

export async function resolveGoogleUser(
  googleId: string,
  displayName: string,
): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { googleId },
  });

  if (existing) {
    if (!existing.displayName && displayName) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { displayName },
      });
    }

    return existing;
  }

  return prisma.user.create({
    data: {
      authType: AuthType.GOOGLE,
      googleId,
      displayName: displayName || ANONYMOUS_DISPLAY_NAME,
    },
  });
}

export async function getCurrentUser(input: {
  deviceId?: string;
} = {}): Promise<User> {
  let session = null;
  try {
    session = await auth();
  } catch {
    // auth() may throw outside Next.js request context (e.g. unit tests or scripts)
  }

  if (session?.user?.id) {
    const byId = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (byId) {
      return byId;
    }
  }

  let deviceId = input.deviceId;
  if (!deviceId) {
    try {
      const cookieStore = await cookies();
      deviceId = cookieStore.get(DEVICE_ID_STORAGE_KEY)?.value;
    } catch {
      // cookies() might not be available if called outside request context (e.g. tests)
    }
  }

  if (!deviceId) {
    throw new Error("Missing deviceId for guest identity");
  }

  return resolveGuestUser(deviceId);
}

export async function getCurrentUserOrNull(input: {
  deviceId?: string;
} = {}): Promise<User | null> {
  try {
    return await getCurrentUser(input);
  } catch {
    return null;
  }
}


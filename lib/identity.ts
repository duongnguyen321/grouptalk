import { AuthType } from "@/generated/prisma/enums";
import type { User } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { ANONYMOUS_DISPLAY_NAME } from "@/lib/constants";
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
}): Promise<User> {
  const session = await auth();

  if (session?.user?.id) {
    const byId = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (byId) {
      return byId;
    }
  }

  if (!input.deviceId) {
    throw new Error("Missing deviceId for guest identity");
  }

  return resolveGuestUser(input.deviceId);
}

"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithGoogle(redirectToOrFormData?: string | FormData) {
  const redirectTo = typeof redirectToOrFormData === "string" ? redirectToOrFormData : "/session";
  await signIn("google", { redirectTo });
}

export async function signOutAction(redirectToOrFormData?: string | FormData) {
  const redirectTo = typeof redirectToOrFormData === "string" ? redirectToOrFormData : "/";
  await signOut({ redirectTo });
}


import { SplashScreen } from "@/components/splash/splash-screen";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <SplashScreen
      hasGoogleSession={Boolean(session?.user)}
      googleSignInAvailable={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
    />
  );
}

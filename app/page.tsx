import { SplashScreen } from "@/components/splash/splash-screen";
import { auth } from "@/lib/auth";
import { getOverviewStats } from "@/app/questions/actions";

export default async function HomePage() {
  const [session, stats] = await Promise.all([
    auth(),
    getOverviewStats(),
  ]);

  return (
    <SplashScreen
      hasGoogleSession={Boolean(session?.user)}
      googleSignInAvailable={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
      stats={stats}
    />
  );
}


import { SessionHome } from "@/components/session/session-home";
import { getOverviewStats } from "@/app/questions/actions";

type SessionPageProps = {
  searchParams: Promise<{ unauthorized?: string }>;
};

export default async function SessionPage({ searchParams }: SessionPageProps) {
  const [{ unauthorized }, stats] = await Promise.all([
    searchParams,
    getOverviewStats(),
  ]);

  return (
    <SessionHome
      unauthorized={Boolean(unauthorized)}
      stats={stats}
    />
  );
}



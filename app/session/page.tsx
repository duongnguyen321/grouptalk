import { SessionHome } from "@/components/session/session-home";

type SessionPageProps = {
  searchParams: Promise<{ unauthorized?: string }>;
};

export default async function SessionPage({ searchParams }: SessionPageProps) {
  const { unauthorized } = await searchParams;
  return <SessionHome unauthorized={Boolean(unauthorized)} />;
}


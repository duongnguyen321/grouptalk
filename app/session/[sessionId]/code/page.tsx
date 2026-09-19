type SessionCodePageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionCodePlaceholderPage({
  params,
}: SessionCodePageProps) {
  const { sessionId } = await params;

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-sm tracking-[0.22em] text-ink-muted uppercase">
        Mã phiên
      </p>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">
        Màn mã phiên sẽ có ở bước sau.
      </h1>
      <p className="mt-3 font-mono text-sm text-ink-muted">{sessionId}</p>
    </main>
  );
}

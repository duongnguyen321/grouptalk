export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto w-full max-w-md space-y-4 pt-16">
        <div className="h-32 rounded-2xl bg-ink/5 animate-pulse" />
        <div className="h-24 rounded-2xl bg-ink/5 animate-pulse" />
        <div className="h-14 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    </main>
  );
}

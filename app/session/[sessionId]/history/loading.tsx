export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto w-full max-w-md space-y-3 pt-16">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-[1.4rem] bg-ink/5 animate-pulse"
          />
        ))}
      </div>
    </main>
  );
}

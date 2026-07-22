import Link from "next/link";

export default function Header({
  right,
}: {
  right?: React.ReactNode;
}) {
  return (
    <header className="border-b border-ink-line bg-ink-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="PayNote logo" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-bold text-ink-text">PayNote</span>
        </Link>
        {right}
      </div>
    </header>
  );
}
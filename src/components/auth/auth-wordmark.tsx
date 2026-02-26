import Link from "next/link";

type AuthWordmarkProps = {
  className?: string;
};

export function AuthWordmark({ className = "" }: AuthWordmarkProps) {
  return (
    <div className={`mb-10 flex justify-center ${className}`.trim()}>
      <Link
        href="/"
        className="inline-flex flex-col items-center rounded-md px-3 py-1 text-center text-2xl font-semibold leading-[1.02] tracking-[0.005em] text-foreground/90 transition hover:text-foreground focus-ring"
      >
        <span>SaaS</span>
        <span>Foundations</span>
      </Link>
    </div>
  );
}

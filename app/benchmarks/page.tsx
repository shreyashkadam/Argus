import { BenchmarkHistory } from "@/components/benchmark-history";

export default function BenchmarksPage() {
  return (
    <div className="min-h-screen">
      <div className="content-column py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
              Benchmark History
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Track verification performance across research sessions
            </p>
          </div>
          <a
            href="/"
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors underline underline-offset-2"
          >
            Back to research
          </a>
        </div>
        <BenchmarkHistory />
      </div>
    </div>
  );
}

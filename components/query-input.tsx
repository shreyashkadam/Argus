"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXAMPLE_QUERIES = [
  "What are the real-world risks and benefits of using synthetic data to train LLMs?",
  "What are the limitations of retrieval-augmented generation (RAG) for enterprise AI?",
  "How do autonomous AI agents fail in production, and what safety measures exist?",
];

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
}

export function QueryInput({ onSubmit, isLoading = false }: QueryInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-5">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a research question..."
          rows={3}
          disabled={isLoading}
          autoFocus
          className={cn(
            "w-full resize-none bg-transparent",
            "border-0 border-b-2 border-[hsl(var(--border))] pb-3",
            "text-lg md:text-xl font-light leading-relaxed",
            "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]",
            "focus:outline-none focus:border-[hsl(var(--foreground))/0.6] transition-colors duration-300",
            "disabled:opacity-50"
          )}
        />
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? "Starting..." : "Research"}
          </Button>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            <kbd className="inline-block px-1 py-0.5 rounded border border-[hsl(var(--border))] font-mono text-[10px] mr-1">Enter</kbd>
            to submit &middot; <kbd className="inline-block px-1 py-0.5 rounded border border-[hsl(var(--border))] font-mono text-[10px] mr-1">Shift+Enter</kbd>
            for new line
          </p>
        </div>
      </div>

      <div className="mt-10">
        <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-4 select-none">
          Try an example
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              disabled={isLoading}
              className={cn(
                "group text-left text-sm text-[hsl(var(--muted-foreground))] leading-relaxed",
                "rounded-lg px-4 py-3 border border-transparent",
                "hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
                "transition-all duration-200",
                "disabled:pointer-events-none"
              )}
            >
              <span className="inline-block text-[hsl(var(--border))] group-hover:text-[hsl(var(--muted-foreground))] mr-2 transition-colors duration-200">→</span>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

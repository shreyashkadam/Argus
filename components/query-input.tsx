"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
            "border-0 border-b border-[hsl(var(--border))] pb-3",
            "text-lg md:text-xl font-light leading-relaxed",
            "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]",
            "focus:outline-none focus:border-[hsl(var(--foreground))] transition-colors duration-200",
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
            Powered by adversarial fact-checking — claims are verified against
            source text
          </p>
        </div>
      </div>
    </div>
  );
}

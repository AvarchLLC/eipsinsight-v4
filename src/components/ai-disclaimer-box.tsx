'use client';

import { Sparkles } from 'lucide-react';

export function AIDisclaimerBox() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
      <div className="mx-auto max-w-6xl rounded-xl border border-border/80 bg-card/70 px-4 py-3 text-xs text-muted-foreground backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="leading-relaxed">
            <span className="font-semibold text-foreground">AI Disclaimer:</span> Some content or metadata on EIPsInsight may be AI-inferred or automatically compiled. If you find any discrepancy, please contact us at{' '}
            <a
              href="mailto:dev@avarch.org"
              className="font-medium text-primary hover:underline"
            >
              dev@avarch.org
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AIDisclaimerBox;

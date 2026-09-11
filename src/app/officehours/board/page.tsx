"use client";

import React, { Suspense } from "react";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { BoardBrowser } from "@/app/(tools)/board/page";

/**
 * Office Hours → Board tab. Renders the review board, which has its own tab row:
 * Editorial queue · On an ACD agenda · Agenda Maker. (No outer sub-tabs — the
 * board's own tabs are the single source of truth.)
 */
export default function OfficeHoursBoardTab() {
  return (
    <Suspense fallback={<div className="py-16"><InlineBrandLoader size="md" label="Loading board…" /></div>}>
      <BoardBrowser />
    </Suspense>
  );
}

import { Suspense } from "react";
import { MonthlyDrilldown } from "@/components/insights/MonthlyDrilldown";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

export default async function MonthlyInsightDetailPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;
  const monthStr = `${year}-${month.padStart(2, "0")}`;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <InlineBrandLoader size="md" label="Loading insight page..." />
        </div>
      }
    >
      <MonthlyDrilldown initialMonth={monthStr} basePath={`/insights/${year}/${month}`} />
    </Suspense>
  );
}

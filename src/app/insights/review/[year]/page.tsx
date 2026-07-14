import { Metadata } from "next";
import YearInReviewClient from "./client-page";

type Props = {
  params: Promise<{ year: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Year in Review | EIPsInsight`,
    description: `A look back at Ethereum governance and standards in ${year}.`,
  };
}

export default async function YearInReviewPage({ params }: Props) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  
  if (isNaN(yearNum) || yearNum < 2015 || yearNum > new Date().getFullYear()) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-8">
        <h1 className="text-4xl font-bold text-foreground">Invalid Year</h1>
        <p className="mt-4 text-muted-foreground">Please select a valid year between 2015 and {new Date().getFullYear()}.</p>
      </div>
    );
  }
  
  return <YearInReviewClient year={yearNum} />;
}

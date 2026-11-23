import type { Metadata } from 'next';
import { GlamsterdamReport } from './_client';

export const metadata: Metadata = {
  title: 'Glamsterdam Gas Audit: Full Report | EIPsInsight Research',
  description:
    'Methodology, validation, challenges, result analysis and risk summary behind the EIPsInsight gas audit of EIP-8037 / 8038 against the busiest mainnet contracts.',
  openGraph: {
    title: 'Glamsterdam Gas Audit: Full Report',
    description:
      'The method, validation and caveats behind the EIP-8037 / 8038 scan of the busiest mainnet contracts.',
  },
};

export const revalidate = 3600;

export default function GlamsterdamReportPage() {
  return <GlamsterdamReport />;
}

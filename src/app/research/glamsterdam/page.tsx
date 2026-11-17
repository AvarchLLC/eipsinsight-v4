import type { Metadata } from 'next';
import { GlamsterdamResearch } from './_client';

export const metadata: Metadata = {
  title: 'What Glamsterdam Breaks | EIPsInsight Research',
  description:
    'EIP-8037/8038 repricing impact: a differential replay of real mainnet transactions under Osaka vs Glamsterdam. ERC-4337 Account Abstraction hard-breaks at verificationGasLimit, the class the professional audits missed.',
  openGraph: {
    title: 'What Glamsterdam Breaks',
    description:
      "A differential replay of real transactions under Glamsterdam's EIP-8037/8038 repricing. ERC-4337 account abstraction hard-breaks where more gas can't help.",
  },
};

export const revalidate = 3600;

export default function GlamsterdamResearchPage() {
  return <GlamsterdamResearch />;
}

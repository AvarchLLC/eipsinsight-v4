import { Metadata } from "next";
import VelocityDashboardClient from "./client-page";

export const metadata: Metadata = {
  title: "Governance Velocity Dashboard | EIPsInsight",
  description: "Measure and visualize the efficiency of the EIP/ERC standards process.",
};

export default function VelocityPage() {
  return <VelocityDashboardClient />;
}

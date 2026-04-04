import React from 'react';

type DeveloperHomeDashboardProps = {
  children: React.ReactNode;
};

export default function DeveloperHomeDashboard({ children }: DeveloperHomeDashboardProps) {
  return (
    <div className="flex flex-col" data-persona-dashboard="developer">
      {children}
    </div>
  );
}


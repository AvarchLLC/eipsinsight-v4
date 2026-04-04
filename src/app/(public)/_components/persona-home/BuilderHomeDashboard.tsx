import React from 'react';

type BuilderHomeDashboardProps = {
  children: React.ReactNode;
};

export default function BuilderHomeDashboard({ children }: BuilderHomeDashboardProps) {
  return (
    <div className="flex flex-col" data-persona-dashboard="builder">
      {children}
    </div>
  );
}


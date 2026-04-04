import React from 'react';

type NewcomerHomeDashboardProps = {
  children: React.ReactNode;
};

export default function NewcomerHomeDashboard({ children }: NewcomerHomeDashboardProps) {
  return (
    <div className="flex flex-col" data-persona-dashboard="newcomer">
      {children}
    </div>
  );
}


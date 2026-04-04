import React from 'react';

type EditorHomeDashboardProps = {
  children: React.ReactNode;
};

export default function EditorHomeDashboard({ children }: EditorHomeDashboardProps) {
  return (
    <div className="flex flex-col" data-persona-dashboard="editor">
      {children}
    </div>
  );
}


'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, Users, Layers3, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'EDITOR' | 'REVIEWER' | 'CONTRIBUTOR' | 'AUTHOR' | null;

interface RoleTabSwitcherProps {
  selectedRole: Role;
  onRoleChange: (role: Role) => void;
  counts: {
    editors: number;
    reviewers: number;
    contributors: number;
    authors: number;
  };
}

const tabs: Array<{ role: Role; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { role: null, label: 'All', icon: Layers3 },
  { role: 'EDITOR', label: 'Editors', icon: Shield },
  { role: 'REVIEWER', label: 'Reviewers', icon: Eye },
  { role: 'CONTRIBUTOR', label: 'Contributors', icon: Users },
  { role: 'AUTHOR', label: 'Authors', icon: PenLine },
];

export function RoleTabSwitcher({ selectedRole, onRoleChange, counts }: RoleTabSwitcherProps) {
  const getCount = (role: Role) => {
    if (role === null) return counts.editors + counts.reviewers + counts.contributors;
    if (role === 'EDITOR') return counts.editors;
    if (role === 'REVIEWER') return counts.reviewers;
    if (role === 'AUTHOR') return counts.authors;
    return counts.contributors;
  };

  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card/60 p-1.5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selectedRole === tab.role;
        const count = getCount(tab.role);

        return (
          <button
            key={tab.role || 'all'}
            onClick={() => onRoleChange(tab.role)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              isSelected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="role-tab-bg"
                className="absolute inset-0 rounded-lg border border-primary/35 bg-primary/15"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon className={cn("relative z-10 h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
            <span className="relative z-10">{tab.label}</span>
            <span className={cn(
              "relative z-10 rounded-md border px-1.5 py-0.5 text-xs font-medium",
              isSelected
                ? "border-primary/35 bg-primary/10 text-primary"
                : "border-border bg-muted/50 text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

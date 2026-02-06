'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'EDITOR' | 'REVIEWER' | 'CONTRIBUTOR' | null;

interface RoleTabSwitcherProps {
  selectedRole: Role;
  onRoleChange: (role: Role) => void;
  counts: {
    editors: number;
    reviewers: number;
    contributors: number;
  };
}

const tabs: Array<{ role: Role; label: string; icon: React.ElementType; color: string }> = [
  { role: null, label: 'All', icon: Users, color: 'cyan' },
  { role: 'EDITOR', label: 'Editors', icon: Shield, color: 'cyan' },
  { role: 'REVIEWER', label: 'Reviewers', icon: Eye, color: 'violet' },
  { role: 'CONTRIBUTOR', label: 'Contributors', icon: Users, color: 'emerald' },
];

export function RoleTabSwitcher({ selectedRole, onRoleChange, counts }: RoleTabSwitcherProps) {
  const getCount = (role: Role) => {
    if (role === null) return counts.editors + counts.reviewers + counts.contributors;
    if (role === 'EDITOR') return counts.editors;
    if (role === 'REVIEWER') return counts.reviewers;
    return counts.contributors;
  };

  return (
    <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-slate-900/50 border border-slate-700/40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selectedRole === tab.role;
        const count = getCount(tab.role);

        return (
          <button
            key={tab.role || 'all'}
            onClick={() => onRoleChange(tab.role)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "text-sm font-medium transition-all",
              isSelected
                ? "text-white"
                : "text-slate-400 hover:text-slate-300"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="role-tab-bg"
                className={cn(
                  "absolute inset-0 rounded-lg border",
                  tab.color === 'cyan' && "bg-cyan-500/20 border-cyan-400/40",
                  tab.color === 'violet' && "bg-violet-500/20 border-violet-400/40",
                  tab.color === 'emerald' && "bg-emerald-500/20 border-emerald-400/40"
                )}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon className={cn(
              "h-4 w-4 relative z-10",
              isSelected && tab.color === 'cyan' && "text-cyan-400",
              isSelected && tab.color === 'violet' && "text-violet-400",
              isSelected && tab.color === 'emerald' && "text-emerald-400"
            )} />
            <span className="relative z-10">{tab.label}</span>
            <span className={cn(
              "relative z-10 px-1.5 py-0.5 rounded text-xs",
              "bg-slate-800",
              isSelected ? "text-white" : "text-slate-500"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

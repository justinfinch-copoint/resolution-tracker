'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Circle } from 'lucide-react';
import type { GoalResponse } from '../types';
// F14: Use centralized status definitions
import { STATUS_CONFIG, GOAL_STATUSES, type GoalStatusValue } from '../types';

type GoalCardProps = {
  goal: GoalResponse;
  onEdit: (goal: GoalResponse) => void;
  onDelete: (goalId: string) => void;
  onStatusChange: (goalId: string, status: GoalStatusValue) => void;
  disabled?: boolean;
};

export function GoalCard({ goal, onEdit, onDelete, onStatusChange, disabled }: GoalCardProps) {
  const { label, variant } = STATUS_CONFIG[goal.status as GoalStatusValue];

  // F8: Delete confirmation
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${goal.title}"? This cannot be undone.`)) {
      onDelete(goal.id);
    }
  };

  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg">{goal.title}</CardTitle>
          <Badge variant={variant}>{label}</Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(goal)} disabled={disabled}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={disabled}>
                <Circle className="mr-2 h-4 w-4" />
                Change Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {GOAL_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onStatusChange(goal.id, status)}
                    disabled={status === goal.status || disabled}
                  >
                    {STATUS_CONFIG[status].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
              disabled={disabled}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
    </Card>
  );
}

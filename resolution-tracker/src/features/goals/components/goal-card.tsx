'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
import { STATUS_CONFIG, GOAL_STATUSES, type GoalStatusValue } from '../types';
import { cn } from '@/lib/utils';

type GoalCardProps = {
  goal: GoalResponse;
  onEdit: (goal: GoalResponse) => void;
  onDelete: (goalId: string) => void;
  onStatusChange: (goalId: string, status: GoalStatusValue) => void;
  disabled?: boolean;
};

export function GoalCard({ goal, onEdit, onDelete, onStatusChange, disabled }: GoalCardProps) {
  const isCompleted = goal.status === 'completed';

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${goal.title}"? This cannot be undone.`)) {
      onDelete(goal.id);
    }
  };

  return (
    <Card className={cn(
      disabled && 'opacity-50',
      isCompleted && 'opacity-70'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
        <CardTitle className={cn(
          "text-lg font-medium",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {goal.title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={disabled}>
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

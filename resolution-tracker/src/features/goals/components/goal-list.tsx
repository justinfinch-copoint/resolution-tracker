'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { GoalCard } from './goal-card';
import { GoalForm } from './goal-form';
import type { GoalResponse } from '../types';
import { MAX_ACTIVE_GOALS, MIN_ACTIVE_GOALS, type GoalStatusValue } from '../types';

type FormState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; goal: GoalResponse };

export function GoalList() {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({ mode: 'closed' });
  // F13: Track which goal is being operated on
  const [operatingGoalId, setOperatingGoalId] = useState<string | null>(null);

  const activeGoalCount = goals.filter((g) => g.status === 'active').length;
  const canAddGoal = activeGoalCount < MAX_ACTIVE_GOALS;

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      const data = await response.json();
      setGoals(data);
      // F12: Clear error on successful fetch
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreate = async (data: { title: string }) => {
    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create goal');
    }

    // F12: Clear error on success
    setError(null);
    await fetchGoals();
    setFormState({ mode: 'closed' });
  };

  const handleEdit = async (data: { title: string }) => {
    if (formState.mode !== 'edit') return;

    const response = await fetch(`/api/goals/${formState.goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update goal');
    }

    // F12: Clear error on success
    setError(null);
    await fetchGoals();
    setFormState({ mode: 'closed' });
  };

  const handleDelete = async (goalId: string) => {
    // F13: Set loading state for this goal
    setOperatingGoalId(goalId);
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete goal');
        return;
      }

      // F12: Clear error on success
      setError(null);
      await fetchGoals();
    } finally {
      setOperatingGoalId(null);
    }
  };

  const handleStatusChange = async (goalId: string, status: GoalStatusValue) => {
    // F13: Set loading state for this goal
    setOperatingGoalId(goalId);
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update status');
        return;
      }

      // F12: Clear error on success
      setError(null);
      await fetchGoals();
    } finally {
      setOperatingGoalId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading goals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex justify-between items-center">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-auto py-1 px-2 text-destructive hover:text-destructive"
          >
            Dismiss
          </Button>
        </div>
      )}

      {activeGoalCount < MIN_ACTIVE_GOALS && goals.length > 0 && (
        <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          Add at least {MIN_ACTIVE_GOALS} goals to stay focused on your resolutions.
        </div>
      )}

      {formState.mode !== 'closed' && (
        <GoalForm
          mode={formState.mode}
          goal={formState.mode === 'edit' ? formState.goal : undefined}
          onSubmit={formState.mode === 'create' ? handleCreate : handleEdit}
          onCancel={() => setFormState({ mode: 'closed' })}
          disabled={formState.mode === 'create' && !canAddGoal}
        />
      )}

      {formState.mode === 'closed' && (
        <Button
          onClick={() => setFormState({ mode: 'create' })}
          disabled={!canAddGoal}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      )}

      {!canAddGoal && formState.mode === 'closed' && (
        <p className="text-sm text-muted-foreground">
          Maximum of {MAX_ACTIVE_GOALS} active goals reached. Complete or pause a goal to add more.
        </p>
      )}

      {goals.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No goals yet. Start by adding your first resolution!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => setFormState({ mode: 'edit', goal: g })}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              // F13: Disable card while operating
              disabled={operatingGoalId === goal.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

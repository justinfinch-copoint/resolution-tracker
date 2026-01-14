'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GoalResponse } from '../types';

type GoalFormProps = {
  mode: 'create' | 'edit';
  goal?: GoalResponse;
  onSubmit: (data: { title: string }) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
};

export function GoalForm({ mode, goal, onSubmit, onCancel, disabled }: GoalFormProps) {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({ title: title.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Add New Goal' : 'Edit Goal'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Exercise 3 times per week"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={disabled || isLoading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={disabled || isLoading}>
                {isLoading ? 'Saving...' : mode === 'create' ? 'Add Goal' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

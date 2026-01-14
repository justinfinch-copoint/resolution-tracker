import { GoalList } from '@/src/features/goals';

export default function GoalsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Goals</h1>
        <p className="mt-2 text-muted-foreground">
          Track your yearly resolutions. Keep 2-5 active goals to stay focused.
        </p>
      </div>
      <GoalList />
    </div>
  );
}

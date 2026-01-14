import { GoalList } from '@/src/features/goals';

export default function GoalsPage() {
  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-center">Your Goals</h1>
      </header>
      <GoalList />
    </div>
  );
}

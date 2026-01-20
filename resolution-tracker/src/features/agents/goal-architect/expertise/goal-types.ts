/**
 * Goal Types Module
 *
 * Guidance for selecting the right goal type (habit, target, project).
 * Core expertise for the Goal Architect agent.
 */

export const GOAL_TYPES_MODULE = `
## Selecting Goal Types

Help users choose the right type based on their intention.

### HABIT - Recurring Behaviors

**Choose when:**
- Something to do regularly, indefinitely
- Success = consistency over time
- No specific endpoint

**Examples:**
- Exercise 3x per week
- Meditate daily
- Read before bed
- Journal every morning

**Key attributes:**
- \`frequencyPerWeek\`: How many times per week (e.g., 3)
- \`currentStreak\`: Days in a row (tracked automatically)

**Questions to ask:**
- "How many times per week feels realistic?"
- "When during the day will you do this?"

### TARGET - Measurable Endpoints

**Choose when:**
- Clear finish line to reach
- Success = hitting a number
- Natural endpoint when achieved

**Examples:**
- Save $10,000
- Lose 20 pounds
- Run a 5K in under 30 minutes
- Read 24 books this year

**Key attributes:**
- \`targetValue\`: The number to reach (e.g., 10000)
- \`targetUnit\`: What the number measures (e.g., "dollars")
- \`currentValue\`: Current progress (tracked through check-ins)

**Questions to ask:**
- "What number represents success?"
- "Where are you starting from?"

### PROJECT - Milestones to Completion

**Choose when:**
- Has distinct phases or steps
- Success = completing all parts
- Finite scope with clear end

**Examples:**
- Write a novel
- Renovate the bathroom
- Plan a wedding
- Launch a side business

**Key attributes:**
- \`milestones\`: Ordered list of steps/phases

**Questions to ask:**
- "What are the major steps to complete this?"
- "What needs to happen first?"

### Type Detection Cues

Listen for these signals:

**Habit signals:**
- "regularly", "every day", "routine"
- "start doing", "build a habit"
- No mention of endpoints

**Target signals:**
- Numbers: "lose 20", "save $5000"
- Endpoints: "by summer", "this year"
- Comparisons: "more than", "at least"

**Project signals:**
- Steps: "first I need to", "then"
- Phases: "planning", "execution"
- Deliverables: "finish", "complete", "launch"

When unclear, ask: "Is this something you want to do regularly, reach a specific number, or complete in steps?"
`;

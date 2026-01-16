// Types
export * from './types';

// Core functionality
export { buildChatContext } from './context-builder';
export { buildSystemPrompt, buildInitialGreeting } from './prompts';
export { createCoachTools, type CoachTools } from './tools';

// Summary repository (for direct access if needed)
export { getUserSummary, getUserSummaryData, upsertUserSummary, mergeUserSummary } from './summary-repository';

// Components
export { ChatThread } from './components/chat-thread';
export { ChatInput } from './components/chat-input';
export { TerminalLine } from './components/terminal-line';
export { ChatErrorBoundary } from './components/chat-error-boundary';

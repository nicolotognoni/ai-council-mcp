export type Provider = "openai" | "anthropic" | "google";

export interface AgentDef {
  id: string;
  name: string;
  emoji: string;
  role: string;
  description: string;
  provider: Provider;
  model: string;
  systemPrompt: string;
  color: string;
}

export interface Message {
  agentId: string;
  content: string;
  round: number;
}

export interface Vote {
  voterId: string;
  votedForId: string;
  reason: string;
}

export interface DebateResult {
  question: string;
  agents: AgentDef[];
  rounds: Message[][];
  votes: Vote[];
  winnerId: string;
  winnerSummary: string;
}

// Live debate types
export type DebateEvent =
  | { type: "agent-response"; agentId: string; round: number; content: string }
  | { type: "round-complete"; round: number }
  | { type: "vote-cast"; voterId: string; votedForId: string; reason: string }
  | { type: "debate-complete"; winnerId: string; winnerSummary: string };

export interface LiveDebateState {
  status: "running" | "voting" | "complete";
  currentRound: number;
  messages: Message[];
  votes: Vote[];
  winnerId?: string;
  winnerSummary?: string;
}

import { z } from "zod";

const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  role: z.string(),
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string(),
  color: z.string(),
});

const messageSchema = z.object({
  agentId: z.string(),
  content: z.string(),
  round: z.number(),
});

const voteSchema = z.object({
  voterId: z.string(),
  votedForId: z.string(),
  reason: z.string(),
});

export const propsSchema = z.object({
  question: z.string(),
  agents: z.array(agentSchema),
  messages: z.array(messageSchema),
  votes: z.array(voteSchema),
  winnerId: z.string(),
  winnerSummary: z.string(),
});

export type CouncilDebateProps = z.infer<typeof propsSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Vote = z.infer<typeof voteSchema>;

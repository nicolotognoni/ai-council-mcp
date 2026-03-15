import React, { useEffect, useState, useRef } from "react";
import type { Agent } from "../types";
import type { AgentStatus } from "./AgentNode";
import { CircleLayout } from "./CircleLayout";
import { hashQuestion } from "../utils/hash";

interface LiveMessage {
  agentId: string;
  content: string;
  round: number;
}

interface LiveVote {
  voterId: string;
  votedForId: string;
  reason: string;
}

interface AgentState {
  status: AgentStatus;
  preview?: string;
  votedForEmoji?: string;
}

const AGENTS_FALLBACK: Agent[] = [
  { id: "strategist", name: "The Strategist", emoji: "♟️", role: "Strategic Thinker", provider: "openai", model: "gpt-5.2", color: "#3B82F6" },
  { id: "pragmatist", name: "The Pragmatist", emoji: "🔧", role: "Practical Problem Solver", provider: "anthropic", model: "claude-opus-4-6", color: "#10B981" },
  { id: "critic", name: "The Critic", emoji: "🔍", role: "Devil's Advocate", provider: "google", model: "gemini-2.5-flash", color: "#EF4444" },
  { id: "innovator", name: "The Innovator", emoji: "💡", role: "Creative Thinker", provider: "openai", model: "gpt-5.2", color: "#F59E0B" },
  { id: "philosopher", name: "The Philosopher", emoji: "🧘", role: "Ethical & Principled Thinker", provider: "anthropic", model: "claude-opus-4-6", color: "#8B5CF6" },
];

export function LiveDebateView({ question }: { question: string }) {
  const [agents] = useState<Agent[]>(AGENTS_FALLBACK);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [votes, setVotes] = useState<LiveVote[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [status, setStatus] = useState<"connecting" | "running" | "voting" | "complete">("connecting");
  const [thinkingAgents, setThinkingAgents] = useState<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const debateId = hashQuestion(question);
    const baseUrl = window.location.origin;
    const es = new EventSource(`${baseUrl}/api/debate-stream/${debateId}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus("running");
      // Initially all agents are thinking in round 1
      setThinkingAgents(new Set(agents.map((a) => a.id)));
    };

    es.addEventListener("state", (e) => {
      const state = JSON.parse(e.data);
      if (state.messages) setMessages(state.messages);
      if (state.votes) setVotes(state.votes);
      if (state.currentRound) setCurrentRound(state.currentRound);
      if (state.status) {
        setStatus(state.status);
        if (state.status === "running") {
          // Figure out which agents haven't responded in current round
          const respondedInRound = new Set(
            state.messages
              .filter((m: LiveMessage) => m.round === state.currentRound)
              .map((m: LiveMessage) => m.agentId)
          );
          setThinkingAgents(
            new Set(agents.filter((a) => !respondedInRound.has(a.id)).map((a) => a.id))
          );
        }
      }
    });

    es.addEventListener("agent-response", (e) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => [...prev, { agentId: data.agentId, content: data.content, round: data.round }]);
      setCurrentRound(data.round);
      setThinkingAgents((prev) => {
        const next = new Set(prev);
        next.delete(data.agentId);
        return next;
      });
    });

    es.addEventListener("round-complete", (e) => {
      const data = JSON.parse(e.data);
      // Next round: all agents start thinking again
      if (data.round < 3) {
        setCurrentRound(data.round + 1);
        setThinkingAgents(new Set(agents.map((a) => a.id)));
      }
    });

    es.addEventListener("vote-cast", (e) => {
      const data = JSON.parse(e.data);
      setVotes((prev) => [...prev, { voterId: data.voterId, votedForId: data.votedForId, reason: data.reason }]);
      setStatus("voting");
      setThinkingAgents((prev) => {
        const next = new Set(prev);
        next.delete(data.voterId);
        return next;
      });
    });

    es.addEventListener("debate-complete", () => {
      setStatus("complete");
      es.close();
    });

    es.onerror = () => {
      // On error, keep showing what we have
      if (status === "connecting") {
        // Retry will happen automatically with EventSource
      }
    };

    return () => {
      es.close();
    };
  }, [question]);

  // Build agent states map
  const agentStates = new Map<string, AgentState>();
  for (const agent of agents) {
    const agentMessages = messages.filter((m) => m.agentId === agent.id);
    const agentVote = votes.find((v) => v.voterId === agent.id);
    const latestMessage = agentMessages[agentMessages.length - 1];

    let agentStatus: AgentStatus = "waiting";
    if (status === "voting" || status === "complete") {
      if (agentVote) {
        const votedFor = agents.find((a) => a.id === agentVote.votedForId);
        agentStates.set(agent.id, {
          status: "voted",
          votedForEmoji: votedFor?.emoji,
        });
        continue;
      } else if (thinkingAgents.has(agent.id)) {
        agentStatus = "voting";
      } else if (latestMessage) {
        agentStatus = "responded";
      }
    } else if (thinkingAgents.has(agent.id)) {
      agentStatus = "thinking";
    } else if (latestMessage) {
      agentStatus = "responded";
    }

    agentStates.set(agent.id, {
      status: agentStatus,
      preview: latestMessage?.content.slice(0, 80),
    });
  }

  const roundLabel = status === "voting" ? "Voting" : `Round ${currentRound}`;

  return (
    <div className="bg-surface-elevated border border-default rounded-3xl p-6">
      <div className="text-center mb-2">
        <span className="text-xs font-medium text-secondary uppercase tracking-wide">
          Council Debate — Live
        </span>
        <h2 className="text-lg font-bold text-default leading-snug mt-1">
          &ldquo;{question}&rdquo;
        </h2>
      </div>

      <CircleLayout
        agents={agents}
        agentStates={agentStates}
        currentRound={status === "voting" ? 4 : currentRound}
        totalRounds={4}
      />

      <div className="text-center mt-2">
        <span
          className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full"
          style={{
            backgroundColor: status === "complete" ? "#10B98120" : "#3B82F620",
            color: status === "complete" ? "#10B981" : "#3B82F6",
          }}
        >
          {status === "connecting" && (
            <>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Connecting...
            </>
          )}
          {status === "running" && (
            <>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {roundLabel} in progress
            </>
          )}
          {status === "voting" && (
            <>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Agents are voting...
            </>
          )}
          {status === "complete" && (
            <>
              <span className="w-2 h-2 rounded-full bg-current" />
              Debate complete!
            </>
          )}
        </span>
      </div>
    </div>
  );
}

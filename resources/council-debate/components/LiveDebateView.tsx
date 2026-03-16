import React, { useEffect, useState, useRef, useCallback } from "react";
import { useCallTool } from "mcp-use/react";
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
  animationDelay?: number;
}

interface DebateStateResponse {
  status: string;
  currentRound: number;
  messages: LiveMessage[];
  votes: LiveVote[];
  winnerId?: string;
  winnerSummary?: string;
}

const AGENTS_FALLBACK: Agent[] = [
  { id: "strategist", name: "The Strategist", emoji: "\u265F\uFE0F", role: "Strategic Thinker", provider: "openai", model: "gpt-5.2", color: "#3B82F6" },
  { id: "pragmatist", name: "The Pragmatist", emoji: "\uD83D\uDD27", role: "Practical Problem Solver", provider: "anthropic", model: "claude-opus-4-6", color: "#10B981" },
  { id: "critic", name: "The Critic", emoji: "\uD83D\uDD0D", role: "Devil's Advocate", provider: "google", model: "gemini-2.5-flash", color: "#EF4444" },
  { id: "innovator", name: "The Innovator", emoji: "\uD83D\uDCA1", role: "Creative Thinker", provider: "openai", model: "gpt-5.2", color: "#F59E0B" },
  { id: "philosopher", name: "The Philosopher", emoji: "\uD83E\uDDD8", role: "Ethical & Principled Thinker", provider: "anthropic", model: "claude-opus-4-6", color: "#8B5CF6" },
];

const POLL_INTERVAL_TOOL = 2000;
const POLL_INTERVAL_FETCH = 1500;

// Detect if we're running inside a ChatGPT/OpenAI widget iframe
function isInChatGPTWidget(): boolean {
  try {
    return typeof (window as any).openai !== "undefined";
  } catch {
    return false;
  }
}

export function LiveDebateView({ question, debateId: debateIdProp }: { question: string; debateId?: string }) {
  const [agents] = useState<Agent[]>(AGENTS_FALLBACK);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [votes, setVotes] = useState<LiveVote[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [status, setStatus] = useState<"connecting" | "running" | "voting" | "complete" | "error">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);

  const debateId = debateIdProp || hashQuestion(question);
  const useTool = isInChatGPTWidget();

  // useCallTool for ChatGPT widget polling
  const { callToolAsync } = useCallTool<
    { debateId: string },
    { content: Array<{ type: string; text: string }> }
  >("get-debate-state");

  // Track previous counts/statuses for animation staggering
  const prevMessageCountRef = useRef(0);
  const prevVoteCountRef = useRef(0);
  const prevAgentStatusRef = useRef<Map<string, AgentStatus>>(new Map());
  const [newVoteStartIndex, setNewVoteStartIndex] = useState(0);
  const [agentTransitions, setAgentTransitions] = useState<Map<string, number>>(new Map());

  const applyState = useCallback((state: DebateStateResponse) => {
    // Only update messages if there are new ones (preserve reference equality)
    setMessages(prev => {
      const incoming = state.messages || [];
      if (incoming.length <= prev.length) return prev;
      prevMessageCountRef.current = prev.length;
      return incoming;
    });

    // Track new votes for stagger animation
    setVotes(prev => {
      const incoming = state.votes || [];
      if (incoming.length <= prev.length) return prev;
      setNewVoteStartIndex(prev.length);
      prevVoteCountRef.current = prev.length;
      return incoming;
    });

    setCurrentRound(state.currentRound || 1);

    if (state.status === "waiting") {
      setStatus("running");
    } else if (state.status === "complete") {
      setStatus("complete");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      setStatus(state.status === "voting" ? "voting" : "running");
    }
  }, []);

  // Poll via useCallTool (ChatGPT)
  const pollViaTool = useCallback(async () => {
    try {
      const result = await callToolAsync({ debateId });
      failCountRef.current = 0;
      const text = result?.content?.[0]?.text;
      if (!text) return;
      const state: DebateStateResponse = JSON.parse(text);
      if (state.status === "not-found") return;
      applyState(state);
    } catch {
      failCountRef.current++;
      if (failCountRef.current >= 5) {
        setStatus("error");
        setConnectionError("Unable to connect to the debate via tool calls.");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [debateId, callToolAsync, applyState]);

  // Poll via fetch (local dev / non-ChatGPT)
  const pollViaFetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/debate-state/${debateId}`);
      if (!res.ok) {
        if (res.status === 404) return;
        throw new Error(`HTTP ${res.status}`);
      }
      failCountRef.current = 0;
      const state: DebateStateResponse = await res.json();
      applyState(state);
    } catch {
      failCountRef.current++;
      if (failCountRef.current >= 5) {
        setStatus("error");
        setConnectionError("Unable to connect to the debate. The server may be unavailable.");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [debateId, applyState]);

  const poll = useTool ? pollViaTool : pollViaFetch;
  const pollInterval = useTool ? POLL_INTERVAL_TOOL : POLL_INTERVAL_FETCH;

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, pollInterval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [poll, pollInterval]);

  // Compute which agents are still "thinking" (haven't responded in current round)
  const respondedInRound = new Set(
    messages.filter((m) => m.round === currentRound).map((m) => m.agentId)
  );
  const respondedCount = respondedInRound.size;

  // Build agent states map with transition tracking for staggered animations
  const agentStates = new Map<string, AgentState>();
  let transitionIndex = 0;
  for (const agent of agents) {
    const agentMessages = messages.filter((m) => m.agentId === agent.id);
    const agentVote = votes.find((v) => v.voterId === agent.id);
    const latestMessage = agentMessages[agentMessages.length - 1];

    let agentStatus: AgentStatus = "waiting";
    if (status === "voting" || status === "complete") {
      if (agentVote) {
        const votedFor = agents.find((a) => a.id === agentVote.votedForId);
        const prevStatus = prevAgentStatusRef.current.get(agent.id);
        const isNewTransition = prevStatus !== "voted";
        agentStates.set(agent.id, {
          status: "voted",
          votedForEmoji: votedFor?.emoji,
          animationDelay: isNewTransition ? transitionIndex * 150 : undefined,
        });
        if (isNewTransition) transitionIndex++;
        prevAgentStatusRef.current.set(agent.id, "voted");
        continue;
      } else if (!agentVote && status === "voting") {
        agentStatus = "voting";
      } else if (latestMessage) {
        agentStatus = "responded";
      }
    } else if (status === "running" && !respondedInRound.has(agent.id) && messages.length > 0) {
      agentStatus = "thinking";
    } else if (status === "running" && respondedInRound.has(agent.id)) {
      agentStatus = "responded";
    } else if (status === "running") {
      agentStatus = "thinking";
    }

    const prevStatus = prevAgentStatusRef.current.get(agent.id);
    const isNewTransition = prevStatus !== agentStatus && agentStatus === "responded";

    agentStates.set(agent.id, {
      status: agentStatus,
      preview: latestMessage?.content.slice(0, 80),
      animationDelay: isNewTransition ? transitionIndex * 150 : undefined,
    });
    if (isNewTransition) transitionIndex++;
    prevAgentStatusRef.current.set(agent.id, agentStatus);
  }

  if (status === "error" && connectionError) {
    return (
      <div className="bg-surface-elevated border border-default rounded-3xl p-8">
        <div className="text-center py-8">
          <div className="text-3xl mb-3">&#x26A0;&#xFE0F;</div>
          <h3 className="text-base font-semibold text-default mb-2">Connection Lost</h3>
          <p className="text-sm text-secondary mb-4">{connectionError}</p>
          <button
            onClick={() => {
              failCountRef.current = 0;
              setStatus("connecting");
              setConnectionError(null);
              poll();
              intervalRef.current = setInterval(poll, pollInterval);
            }}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const roundLabels = ["Proposal", "Critique", "Refinement", "Vote"];

  return (
    <div className="bg-surface-elevated border border-default rounded-3xl p-6">
      <div className="text-center mb-2">
        <span className="text-xs font-medium text-secondary uppercase tracking-widest">
          Council Debate — Live
        </span>
        <h2 className="text-xl font-bold text-default leading-snug mt-1">
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
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full"
          style={{
            backgroundColor: status === "complete" ? "#10B98120" : status === "voting" ? "#F59E0B20" : "#3B82F620",
            color: status === "complete" ? "#10B981" : status === "voting" ? "#F59E0B" : "#3B82F6",
            boxShadow: status === "voting" ? "0 0 20px rgba(245,158,11,0.15)" : "none",
          }}
        >
          {status === "connecting" && (
            <>
              <span className="w-2 h-2 rounded-full bg-current shimmer" />
              Assembling the Council...
            </>
          )}
          {status === "running" && (
            <>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {roundLabels[currentRound - 1]} (Round {currentRound}) — {respondedCount}/{agents.length} responded
            </>
          )}
          {status === "voting" && (
            <>
              <span className="w-2 h-2 rounded-full bg-current glow-pulse" />
              Voting — {votes.length}/{agents.length} cast
            </>
          )}
          {status === "complete" && (
            <>
              <span className="text-xs">&#x2705;</span>
              Debate complete!
            </>
          )}
        </span>
      </div>

      {/* Live vote feed */}
      {(status === "voting" || status === "complete") && votes.length > 0 && (
        <div className="mt-4 space-y-1.5 px-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide text-center mb-2">
            Votes
          </div>
          {votes.map((vote, i) => {
            const voter = agents.find((a) => a.id === vote.voterId);
            const votedFor = agents.find((a) => a.id === vote.votedForId);
            if (!voter || !votedFor) return null;
            const isNewVote = i >= newVoteStartIndex;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs text-secondary px-3 py-1.5 rounded-lg ${isNewVote ? "fade-in" : ""}`}
                style={{
                  backgroundColor: votedFor.color + "10",
                  ...(isNewVote ? { animationDelay: `${(i - newVoteStartIndex) * 150}ms`, animationFillMode: "both" } : {}),
                }}
              >
                <span className="text-base">{voter.emoji}</span>
                <span className="font-medium text-default">{voter.name.replace("The ", "")}</span>
                <span>&rarr;</span>
                <span className="text-base">{votedFor.emoji}</span>
                <span className="font-medium text-default">{votedFor.name.replace("The ", "")}</span>
                {vote.reason && (
                  <span className="text-secondary italic ml-auto truncate max-w-[200px]">&ldquo;{vote.reason}&rdquo;</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

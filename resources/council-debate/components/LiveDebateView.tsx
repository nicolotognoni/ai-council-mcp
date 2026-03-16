import React, { useEffect, useState, useRef, useCallback } from "react";
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

const POLL_INTERVAL = 1500;

export function LiveDebateView({ question }: { question: string }) {
  const [agents] = useState<Agent[]>(AGENTS_FALLBACK);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [votes, setVotes] = useState<LiveVote[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [status, setStatus] = useState<"connecting" | "running" | "voting" | "complete" | "error">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);

  const debateId = hashQuestion(question);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/debate-state/${debateId}`);
      if (!res.ok) {
        if (res.status === 404) return; // debate not created yet
        throw new Error(`HTTP ${res.status}`);
      }
      failCountRef.current = 0;
      const state = await res.json();

      setMessages(state.messages || []);
      setVotes(state.votes || []);
      setCurrentRound(state.currentRound || 1);

      if (state.status === "waiting") {
        setStatus("running");
      } else if (state.status === "complete") {
        setStatus("complete");
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setStatus(state.status === "voting" ? "voting" : "running");
      }
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
  }, [debateId]);

  useEffect(() => {
    // Initial poll
    poll();
    // Start polling interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [poll]);

  // Compute which agents are still "thinking" (haven't responded in current round)
  const respondedInRound = new Set(
    messages.filter((m) => m.round === currentRound).map((m) => m.agentId)
  );
  const respondedCount = respondedInRound.size;

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

    agentStates.set(agent.id, {
      status: agentStatus,
      preview: latestMessage?.content.slice(0, 80),
    });
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
              intervalRef.current = setInterval(poll, POLL_INTERVAL);
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
            return (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-secondary px-3 py-1.5 rounded-lg fade-in"
                style={{ backgroundColor: votedFor.color + "10" }}
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

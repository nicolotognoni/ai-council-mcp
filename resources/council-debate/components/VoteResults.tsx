import React from "react";
import type { Agent, Vote } from "../types";

export function VoteResults({
  votes,
  agents,
  winnerId,
}: {
  votes: Vote[];
  agents: Agent[];
  winnerId: string;
}) {
  const voteCounts = new Map<string, number>();
  for (const v of votes) {
    voteCounts.set(v.votedForId, (voteCounts.get(v.votedForId) || 0) + 1);
  }

  const totalVoters = agents.length - 1;
  const sorted = [...voteCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="px-6 py-3 space-y-3">
      <h3 className="text-sm font-semibold text-default">Vote Results</h3>
      <div className="space-y-2">
        {sorted.map(([agentId, count]) => {
          const agent = agents.find((a) => a.id === agentId);
          if (!agent) return null;
          const pct = Math.round((count / totalVoters) * 100);
          const isWinner = agentId === winnerId;
          return (
            <div key={agentId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span>{agent.emoji}</span>
                  <span
                    className={`font-medium ${isWinner ? "text-default" : "text-secondary"}`}
                  >
                    {agent.name}
                  </span>
                  {isWinner && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      WINNER
                    </span>
                  )}
                </div>
                <span className="text-secondary font-medium">
                  {count}/{totalVoters} votes
                </span>
              </div>
              <div className="h-2 bg-default/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isWinner ? agent.color : agent.color + "80",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2 pt-2 border-t border-default/10">
        <h4 className="text-xs font-semibold text-secondary">Vote Details</h4>
        {votes.map((vote, i) => {
          const voter = agents.find((a) => a.id === vote.voterId);
          const votedFor = agents.find((a) => a.id === vote.votedForId);
          return (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-secondary"
            >
              <span className="flex-shrink-0">
                {voter?.emoji} voted for {votedFor?.emoji}
              </span>
              <span className="italic">"{vote.reason}"</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

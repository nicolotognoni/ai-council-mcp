import React from "react";
import type { Agent } from "../types";
import { MarkdownContent } from "./MarkdownContent";

export function WinnerCard({
  agent,
  summary,
  voteCount,
  totalVoters,
}: {
  agent: Agent;
  summary: string;
  voteCount: number;
  totalVoters: number;
}) {
  return (
    <div
      className="mx-6 my-4 rounded-2xl border-2 p-5 relative overflow-hidden slide-up shimmer-overlay bg-surface-elevated"
      style={{
        borderColor: agent.color,
      }}
    >
      <div
        className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: agent.color }}
      />
      <div
        className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-10"
        style={{ backgroundColor: agent.color }}
      />
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-4xl"
            style={{
              backgroundColor: agent.color + "25",
              boxShadow: `0 0 24px ${agent.color}30`,
            }}
          >
            {agent.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-default">
                {agent.name}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                WINNER
              </span>
            </div>
            <div className="text-xs text-secondary">
              {agent.role} &middot; {voteCount}/{totalVoters} votes
            </div>
          </div>
        </div>
        <div className="text-sm text-secondary leading-relaxed">
          <MarkdownContent content={summary} />
        </div>
      </div>
    </div>
  );
}

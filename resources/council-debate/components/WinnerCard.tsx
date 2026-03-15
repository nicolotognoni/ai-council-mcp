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
      className="mx-6 my-3 rounded-2xl border-2 p-5 relative overflow-hidden"
      style={{
        borderColor: agent.color,
        background: `linear-gradient(135deg, ${agent.color}08, ${agent.color}15)`,
      }}
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: agent.color }}
      />
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: agent.color + "25" }}
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

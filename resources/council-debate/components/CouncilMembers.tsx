import React from "react";
import type { Agent } from "../types";

const providerBadge: Record<string, { label: string; bg: string }> = {
  openai: { label: "OpenAI", bg: "bg-[#10A37F]/15 text-[#10A37F]" },
  anthropic: { label: "Anthropic", bg: "bg-[#D97706]/15 text-[#D97706]" },
  google: { label: "Google", bg: "bg-[#4285F4]/15 text-[#4285F4]" },
};

export function CouncilMembers({
  agents,
  winnerId,
}: {
  agents: Agent[];
  winnerId: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-6 py-3 scrollbar-none">
      {agents.map((agent) => {
        const isWinner = agent.id === winnerId;
        const badge = providerBadge[agent.provider];
        return (
          <div
            key={agent.id}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
              isWinner
                ? "border-[var(--winner-color)] bg-[var(--winner-color)]/5 shadow-sm"
                : "border-default bg-surface"
            }`}
            style={
              isWinner
                ? ({ "--winner-color": agent.color } as React.CSSProperties)
                : undefined
            }
          >
            <span className="text-lg">{agent.emoji}</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-default truncate">
                {agent.name}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.bg}`}
                >
                  {badge.label}
                </span>
                {isWinner && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Winner
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React from "react";
import type { Agent, Message } from "../types";
import { MarkdownContent } from "./MarkdownContent";

const providerBadge: Record<string, { label: string; bg: string }> = {
  openai: { label: "OpenAI", bg: "bg-[#10A37F]/15 text-[#10A37F]" },
  anthropic: { label: "Anthropic", bg: "bg-[#D97706]/15 text-[#D97706]" },
  google: { label: "Google", bg: "bg-[#4285F4]/15 text-[#4285F4]" },
};

export function MessageBubble({
  message,
  agent,
  isExpanded,
  onToggle,
}: {
  message: Message;
  agent: Agent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const badge = providerBadge[agent.provider];
  const lines = message.content.split("\n");
  const isLong = lines.length > 4 || message.content.length > 300;
  const displayContent = isExpanded
    ? message.content
    : isLong
      ? message.content.slice(0, 280) + "..."
      : message.content;

  return (
    <div className="flex gap-3 px-6 py-2">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: agent.color + "20" }}
      >
        {agent.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-default">
            {agent.name}
          </span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.bg}`}
          >
            {badge.label}
          </span>
          <span className="text-[10px] text-secondary">{agent.model}</span>
        </div>
        <div className="text-sm text-secondary leading-relaxed">
          <MarkdownContent content={displayContent} />
        </div>
        {isLong && (
          <button
            onClick={onToggle}
            className="text-xs text-info hover:underline mt-1 cursor-pointer"
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
}

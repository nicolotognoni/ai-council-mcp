import React from "react";
import type { Agent } from "../types";

export type AgentStatus = "waiting" | "thinking" | "responded" | "voting" | "voted";

export function AgentNode({
  agent,
  status,
  preview,
  votedForEmoji,
  style,
}: {
  agent: Agent;
  status: AgentStatus;
  preview?: string;
  votedForEmoji?: string;
  style?: React.CSSProperties;
}) {
  const isThinking = status === "thinking";
  const isResponded = status === "responded";
  const isVoting = status === "voting";
  const isVoted = status === "voted";

  return (
    <div className="absolute flex flex-col items-center" style={style}>
      {/* Agent circle */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-3 transition-all duration-500 ${
          isThinking ? "agent-thinking" : ""
        } ${isResponded || isVoted ? "scale-110" : ""}`}
        style={{
          borderColor: status === "waiting" ? "transparent" : agent.color,
          backgroundColor: agent.color + "15",
          boxShadow: isResponded || isVoted ? `0 0 20px ${agent.color}30` : "none",
        }}
      >
        {agent.emoji}
      </div>

      {/* Agent name */}
      <span className="text-[10px] font-semibold text-default mt-1 whitespace-nowrap">
        {agent.name.replace("The ", "")}
      </span>

      {/* Status indicator */}
      {isThinking && (
        <div className="flex gap-0.5 mt-1">
          <div className="w-1 h-1 rounded-full thinking-dot" style={{ backgroundColor: agent.color }} />
          <div className="w-1 h-1 rounded-full thinking-dot" style={{ backgroundColor: agent.color, animationDelay: "0.2s" }} />
          <div className="w-1 h-1 rounded-full thinking-dot" style={{ backgroundColor: agent.color, animationDelay: "0.4s" }} />
        </div>
      )}

      {/* Preview bubble */}
      {isResponded && preview && (
        <div
          className="mt-1 max-w-[120px] text-[9px] text-secondary leading-tight px-2 py-1 rounded-lg border border-default/10 bg-surface-elevated line-clamp-2 fade-in"
        >
          {preview}
        </div>
      )}

      {/* Vote indicator */}
      {isVoted && votedForEmoji && (
        <div className="mt-1 text-xs fade-in">
          → {votedForEmoji}
        </div>
      )}
    </div>
  );
}

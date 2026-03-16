import React from "react";
import type { Agent } from "../types";
import { AgentNode, type AgentStatus } from "./AgentNode";

interface AgentState {
  status: AgentStatus;
  preview?: string;
  votedForEmoji?: string;
  animationDelay?: number;
}

const ROUND_LABELS = ["Proposal", "Critique", "Refinement", "Vote"];

export function CircleLayout({
  agents,
  agentStates,
  currentRound,
  totalRounds,
}: {
  agents: Agent[];
  agentStates: Map<string, AgentState>;
  currentRound: number;
  totalRounds: number;
}) {
  const radius = 120;
  const containerSize = radius * 2 + 140;

  // Generate arc paths between adjacent agents along the circle
  const cx = containerSize / 2;
  const cy = containerSize / 2;

  return (
    <div className="flex flex-col items-center py-4">
      <div
        className="relative"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Circle ring connecting agents */}
        <svg
          className="absolute inset-0"
          width={containerSize}
          height={containerSize}
          style={{ pointerEvents: "none" }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.1"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Center indicator */}
        <div
          className="absolute flex flex-col items-center justify-center"
          style={{
            left: cx,
            top: cy,
            transform: "translate(-50%, -50%)",
            width: 80,
            height: 80,
          }}
        >
          <div className="text-[10px] font-semibold text-secondary uppercase tracking-wide">
            Round {currentRound}
          </div>
          <div className="text-lg font-bold text-default leading-none mt-0.5">
            {ROUND_LABELS[currentRound - 1] || `${currentRound}`}
          </div>
          <div className="text-[10px] text-secondary mt-0.5">{currentRound} of {totalRounds}</div>
          {/* Progress ring with gradient glow */}
          <svg className="absolute w-20 h-20" viewBox="0 0 80 80">
            <defs>
              <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <circle
              cx="40" cy="40" r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-default/10"
            />
            <circle
              cx="40" cy="40" r="35"
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth="2.5"
              strokeDasharray={`${(currentRound / totalRounds) * 220} 220`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
              style={{
                transition: "stroke-dasharray 0.5s ease",
                filter: "drop-shadow(0 0 4px rgba(59,130,246,0.4))",
              }}
            />
          </svg>
        </div>

        {/* Agent nodes positioned in a circle */}
        {agents.map((agent, i) => {
          const angle = (i * 2 * Math.PI) / agents.length - Math.PI / 2;
          const x = Math.cos(angle) * radius + containerSize / 2;
          const y = Math.sin(angle) * radius + containerSize / 2;
          const state = agentStates.get(agent.id) || { status: "waiting" as const };

          return (
            <AgentNode
              key={agent.id}
              agent={agent}
              status={state.status}
              preview={state.preview}
              votedForEmoji={state.votedForEmoji}
              animationDelay={state.animationDelay}
              style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import type { Agent } from "../types";
import { AgentNode, type AgentStatus } from "./AgentNode";

interface AgentState {
  status: AgentStatus;
  preview?: string;
  votedForEmoji?: string;
}

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
  const radius = 110;
  const containerSize = radius * 2 + 140;

  return (
    <div className="flex flex-col items-center py-4">
      <div
        className="relative"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Center indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
              Round
            </div>
            <div className="text-3xl font-bold text-default">
              {currentRound}
            </div>
            <div className="text-[10px] text-secondary">of {totalRounds}</div>
            {/* Progress ring */}
            <svg className="absolute w-20 h-20" viewBox="0 0 80 80">
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
                stroke="currentColor"
                strokeWidth="2"
                className="text-info"
                strokeDasharray={`${(currentRound / totalRounds) * 220} 220`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            </svg>
          </div>
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

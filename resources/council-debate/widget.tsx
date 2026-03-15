import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useState } from "react";
import "../styles.css";
import { CouncilMembers } from "./components/CouncilMembers";
import { LiveDebateView } from "./components/LiveDebateView";
import { MessageBubble } from "./components/MessageBubble";
import { RoundTimeline } from "./components/RoundTimeline";
import { VoteResults } from "./components/VoteResults";
import { WinnerCard } from "./components/WinnerCard";
import { propsSchema, type CouncilDebateProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Display the results of a council debate between AI agents with different specializations",
  props: propsSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "The Council is deliberating...",
    invoked: "The Council has reached a verdict",
  },
};

export default function CouncilDebate() {
  const { props, isPending, toolInput } = useWidget<CouncilDebateProps>();
  const [activeRound, setActiveRound] = useState(0);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );

  if (isPending) {
    const question = (toolInput as { question?: string })?.question;

    if (question) {
      return (
        <McpUseProvider autoSize>
          <LiveDebateView question={question} />
        </McpUseProvider>
      );
    }

    return (
      <McpUseProvider autoSize>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-bounce">&#9878;&#65039;</div>
            <h3 className="text-lg font-semibold text-default mb-2">
              The Council is deliberating...
            </h3>
            <p className="text-sm text-secondary">
              5 AI agents are debating across 4 rounds
            </p>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { question, agents, rounds, votes, winnerId, winnerSummary } = props;
  const winnerAgent = agents.find((a) => a.id === winnerId)!;
  const voteCount = votes.filter((v) => v.votedForId === winnerId).length;
  const currentRound = rounds[activeRound] || [];

  const toggleMessage = (key: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <McpUseProvider autoSize>
      <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-secondary uppercase tracking-wide">
              Council Debate
            </span>
            <span className="text-xs text-secondary">&middot;</span>
            <span className="text-xs text-secondary">
              {agents.length} agents &middot; {rounds.length} rounds
            </span>
          </div>
          <h2 className="text-lg font-bold text-default leading-snug">
            &ldquo;{question}&rdquo;
          </h2>
        </div>

        {/* Council Members Strip */}
        <CouncilMembers agents={agents} winnerId={winnerId} />

        {/* Divider */}
        <div className="h-px bg-default/10 mx-6" />

        {/* Round Timeline */}
        <RoundTimeline
          activeRound={activeRound}
          onRoundChange={setActiveRound}
        />

        {/* Messages */}
        <div className="py-2">
          {activeRound < 3 ? (
            currentRound.map((message) => {
              const agent = agents.find((a) => a.id === message.agentId);
              if (!agent) return null;
              const key = `${message.round}-${message.agentId}`;
              return (
                <MessageBubble
                  key={key}
                  message={message}
                  agent={agent}
                  isExpanded={expandedMessages.has(key)}
                  onToggle={() => toggleMessage(key)}
                />
              );
            })
          ) : (
            <VoteResults
              votes={votes}
              agents={agents}
              winnerId={winnerId}
            />
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-default/10 mx-6" />

        {/* Winner Card */}
        <WinnerCard
          agent={winnerAgent}
          summary={winnerSummary}
          voteCount={voteCount}
          totalVoters={agents.length - 1}
        />
      </div>
    </McpUseProvider>
  );
}

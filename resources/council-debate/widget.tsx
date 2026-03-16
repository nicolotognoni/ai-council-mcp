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
import { hashQuestion } from "./utils/hash";

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

class DebugErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[council-debate] ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="text-center py-8">
            <div className="text-3xl mb-3">&#x26A0;&#xFE0F;</div>
            <h3 className="text-base font-semibold text-default mb-2">
              Widget Error
            </h3>
            <p className="text-sm text-secondary mb-2">
              {this.state.error.message}
            </p>
            <pre className="text-xs text-secondary overflow-auto max-h-32 text-left mx-4 p-2 bg-surface rounded-lg">
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function CouncilDebateInner() {
  const { props, isPending, toolInput } = useWidget<CouncilDebateProps>();
  const [activeRound, setActiveRound] = useState(0);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );

  console.log("[council-debate] render — isPending:", isPending, "hasProps:", !!props, "hasAgents:", !!props?.agents, "toolInput:", JSON.stringify(toolInput));

  if (isPending) {
    const question = (toolInput as { question?: string })?.question;

    if (question) {
      const debateId = hashQuestion(question);
      return (
        <McpUseProvider autoSize>
          <div className="min-h-[200px]">
            <LiveDebateView question={question} debateId={debateId} />
          </div>
        </McpUseProvider>
      );
    }

    return (
      <McpUseProvider autoSize>
        <div className="min-h-[200px]">
          <div className="bg-surface-elevated border border-default rounded-3xl p-8">
            <div className="text-center py-12">
              <div className="text-4xl mb-4 animate-bounce">&#9878;&#65039;</div>
              <h3 className="text-lg font-semibold text-default mb-2">
                Assembling the Council...
              </h3>
              <p className="text-sm text-secondary">
                5 AI agents are debating across 4 rounds
              </p>
            </div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  // Defensive: if props are completely missing, show fallback
  if (!props?.agents) {
    console.error("[council-debate] props or props.agents is null/undefined — props:", JSON.stringify(props));
    return (
      <McpUseProvider autoSize>
        <div className="min-h-[200px]">
          <div className="bg-surface-elevated border border-default rounded-3xl p-8">
            <div className="text-center py-8">
              <div className="text-3xl mb-3">&#9878;&#65039;</div>
              <h3 className="text-lg font-semibold text-default mb-2">
                Council Debate Complete
              </h3>
              <p className="text-sm text-secondary mt-2">
                The debate results could not be displayed.
              </p>
              <p className="text-xs text-secondary mt-2">
                props: {props ? "present" : "null"}, agents: {props?.agents ? String(props.agents.length) : "missing"}
              </p>
            </div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  // Debug: log received props to help diagnose widget crashes
  console.log("[council-debate] isPending=false, props:", JSON.stringify({
    question: props.question,
    agentsCount: props.agents?.length,
    messagesCount: props.messages?.length,
    votesCount: props.votes?.length,
    winnerId: props.winnerId,
    hasWinnerSummary: !!props.winnerSummary,
  }));

  // Defensive: if props are missing/incomplete, show fallback instead of crashing
  const question = props.question || "";
  const agents = props.agents || [];
  const messages = props.messages || [];
  const votes = props.votes || [];
  const winnerId = props.winnerId || "";
  const winnerSummary = props.winnerSummary || "";

  const winnerAgent = agents.find((a) => a.id === winnerId);
  const voteCount = votes.filter((v) => v.votedForId === winnerId).length;

  // Derive rounds from flat messages
  const totalRounds = new Set(messages.map((m) => m.round)).size || 1;
  const currentRoundMessages = messages.filter(
    (m) => m.round === activeRound + 1
  );

  if (!winnerAgent || agents.length === 0) {
    console.error("[council-debate] Missing data - winnerAgent:", winnerAgent, "agents:", agents.length, "winnerId:", winnerId);
    return (
      <McpUseProvider autoSize>
        <div className="min-h-[200px]">
          <div className="bg-surface-elevated border border-default rounded-3xl p-8">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-default mb-2">
                Council Debate Complete
              </h3>
              {winnerSummary && (
                <p className="text-sm text-secondary mt-4">{winnerSummary}</p>
              )}
            </div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

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
      <div className="min-h-[200px] bg-surface-elevated border border-default rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-secondary uppercase tracking-widest">
              Council Debate
            </span>
            <span className="text-xs text-secondary">&middot;</span>
            <span className="text-xs text-secondary">
              {agents.length} agents &middot; {totalRounds} rounds
            </span>
          </div>
          <h2 className="text-xl font-bold text-default leading-snug">
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
        <div className="py-3">
          {activeRound < 3 ? (
            currentRoundMessages.map((message) => {
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

export default function CouncilDebate() {
  return (
    <DebugErrorBoundary>
      <CouncilDebateInner />
    </DebugErrorBoundary>
  );
}

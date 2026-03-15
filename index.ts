import { MCPServer, widget, text, error } from "mcp-use/server";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { runDebate } from "./council/debate.js";
import { debateStore, hashQuestion } from "./council/debate-store.js";
import type { DebateEvent } from "./council/types.js";

const server = new MCPServer({
  name: "ai-council-mcp",
  title: "AI Council MCP",
  version: "1.0.0",
  description: "A council of AI agents debates complex questions across multiple rounds",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

server.tool(
  {
    name: "council-debate",
    description:
      "Submit a complex question to a council of 5 AI agents with different specializations and personalities. They debate in 4 rounds (proposal, critique, counter-argument, vote) and a winner emerges.",
    schema: z.object({
      question: z
        .string()
        .describe("The complex question to submit to the council for debate"),
    }),
    widget: {
      name: "council-debate",
      invoking: "The Council is deliberating...",
      invoked: "The Council has reached a verdict",
    },
  },
  async ({ question }, ctx) => {
    try {
      await ctx.reportProgress?.(0, 100, "Assembling the Council...");

      const debateId = hashQuestion(question);
      debateStore.createDebate(debateId);

      // Wait for the widget's SSE client to connect before starting the debate
      await debateStore.waitForClient(debateId, 15000);

      const result = await runDebate(question, debateId);

      await ctx.reportProgress?.(100, 100, "Debate complete!");

      const winnerAgent = result.agents.find((a) => a.id === result.winnerId);
      const voteCount = result.votes.filter(
        (v) => v.votedForId === result.winnerId
      ).length;

      return widget({
        props: {
          question: result.question,
          agents: result.agents.map((a) => ({
            id: a.id,
            name: a.name,
            emoji: a.emoji,
            role: a.role,
            provider: a.provider,
            model: a.model,
            color: a.color,
          })),
          rounds: result.rounds,
          votes: result.votes,
          winnerId: result.winnerId,
          winnerSummary: result.winnerSummary,
        },
        output: text(
          `The Council debated: "${question}"\n\n` +
            `Winner: ${winnerAgent?.emoji} ${winnerAgent?.name} (${voteCount}/${result.agents.length - 1} votes)\n\n` +
            `Winning answer:\n${result.winnerSummary}`
        ),
      });
    } catch (err) {
      console.error("Council debate failed:", err);
      return error(
        `Council debate failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
);

// SSE endpoint for live debate updates
server.app.get("/api/debate-stream/:debateId", (c) => {
  const debateId = c.req.param("debateId");
  return streamSSE(c, async (stream) => {
    // Subscribe to future events FIRST, before catch-up, to avoid missing anything
    const onEvent = async (event: DebateEvent) => {
      await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
    };
    debateStore.subscribe(debateId, onEvent);

    // Signal that the SSE connection is active
    await stream.writeSSE({ event: "connected", data: JSON.stringify({ debateId }) });

    // Send catch-up: replay individual events so the widget can animate them
    const state = debateStore.getState(debateId);
    if (state) {
      // Replay each message as an individual agent-response event
      for (const msg of state.messages) {
        await stream.writeSSE({
          event: "agent-response",
          data: JSON.stringify({ agentId: msg.agentId, round: msg.round, content: msg.content }),
        });
      }

      // Replay completed rounds
      const completedRounds = new Set(state.messages.map((m) => m.round));
      for (const round of [...completedRounds].sort()) {
        const allAgentsResponded = state.messages.filter((m) => m.round === round).length >= 5;
        if (allAgentsResponded) {
          await stream.writeSSE({
            event: "round-complete",
            data: JSON.stringify({ round }),
          });
        }
      }

      // Replay votes
      for (const vote of state.votes) {
        await stream.writeSSE({
          event: "vote-cast",
          data: JSON.stringify(vote),
        });
      }

      // Send status
      await stream.writeSSE({
        event: "state",
        data: JSON.stringify({ status: state.status, currentRound: state.currentRound }),
      });
    }

    // Signal the debate can start (client is connected)
    debateStore.markReady(debateId);

    // If already complete, close immediately
    if (state?.status === "complete") {
      debateStore.unsubscribe(debateId, onEvent);
      return;
    }

    // Wait for completion
    await new Promise<void>((resolve) => {
      const check = (e: DebateEvent) => {
        if (e.type === "debate-complete") {
          debateStore.unsubscribe(debateId, check);
          resolve();
        }
      };
      debateStore.subscribe(debateId, check);
    });

    debateStore.unsubscribe(debateId, onEvent);
  });
});

server.listen().then(() => {
  console.log("Council MCP server running");
});

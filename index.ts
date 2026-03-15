import { MCPServer, widget, text, error } from "mcp-use/server";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { runDebate } from "./council/debate.js";
import { debateStore, hashQuestion } from "./council/debate-store.js";
import type { DebateEvent } from "./council/types.js";

const server = new MCPServer({
  name: "council-mcp",
  title: "Council MCP",
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
    // Send current state for catch-up
    const state = debateStore.getState(debateId);
    if (state) {
      await stream.writeSSE({ event: "state", data: JSON.stringify(state) });
    }

    // If already complete, close immediately
    if (state?.status === "complete") {
      return;
    }

    // Subscribe to future events
    const onEvent = async (event: DebateEvent) => {
      await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
    };
    debateStore.subscribe(debateId, onEvent);

    // Wait for completion
    await new Promise<void>((resolve) => {
      if (state?.status === "complete") {
        resolve();
        return;
      }
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

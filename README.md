# AI Council MCP

An MCP (Model Context Protocol) server that assembles a council of 5 AI agents — each powered by a different LLM and with a unique personality — to debate complex questions across multiple rounds, then vote on the best answer.

Built with [mcp-use](https://mcp-use.com) and compatible with ChatGPT, Claude, and any MCP-compatible client.

## How It Works

You ask a question. Five AI agents with distinct roles debate it across 4 structured rounds:

| Agent | Role | Provider |
|-------|------|----------|
| ♟️ **The Strategist** | Long-term & systems thinking | OpenAI (GPT) |
| 🔧 **The Pragmatist** | Practical, implementable solutions | Anthropic (Claude) |
| 🔍 **The Critic** | Devil's advocate, stress-testing ideas | Google (Gemini) |
| 💡 **The Innovator** | Creative, unconventional approaches | OpenAI (GPT) |
| 🧘 **The Philosopher** | Ethics, principles & deeper meaning | Anthropic (Claude) |

### Debate Rounds

1. **Proposal** — Each agent presents their initial answer
2. **Critique** — Agents critique each other's proposals
3. **Counter-argument** — Agents refine their positions based on critiques
4. **Vote** — Each agent votes for the best answer (can't vote for themselves)

The winner is determined by majority vote, with a tiebreaker round if needed.

### Live UI Widget

The server includes a real-time React widget that streams the debate as it happens via SSE (Server-Sent Events), with animated agent responses, round progression, and vote visualization.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- API keys for at least one of: OpenAI, Anthropic, Google AI

### Installation

```bash
git clone https://github.com/nicolotognoni/ai-council-mcp.git
cd ai-council-mcp
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-ai-key
```

### Run the Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm run build && npm start
```

The server runs on `http://localhost:3000` by default. Open `http://localhost:3000/inspector` to test it interactively.

## Connect to ChatGPT

1. Open [ChatGPT](https://chatgpt.com)
2. Go to **Settings → MCP Servers → Add Server**
3. Enter the server URL (e.g. `http://localhost:3000/sse` for local, or your deployed URL)
4. The `council-debate` tool will appear in ChatGPT — ask any complex question and the council will debate it

> **Tip:** Deploy to a public URL for persistent access. You can use `npm run deploy` to deploy on [Manufact Cloud](https://manufact.dev), or host it anywhere that supports Node.js.

## Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-council": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## Connect to Any MCP Client

This is a standard MCP server. Connect using the SSE transport at:

```
http://localhost:3000/sse
```

## Project Structure

```
├── index.ts                  # MCP server entry point & tool definition
├── council/
│   ├── agents.ts             # Agent definitions (roles, models, prompts)
│   ├── debate.ts             # Debate orchestration (4 rounds + voting)
│   ├── debate-store.ts       # Live debate state management & SSE pub/sub
│   ├── llm.ts                # Multi-provider LLM abstraction (OpenAI, Anthropic, Google)
│   └── types.ts              # TypeScript types
├── resources/
│   ├── council-debate/       # React widget for live debate visualization
│   │   ├── widget.tsx
│   │   ├── components/       # UI components (AgentNode, VoteResults, etc.)
│   │   ├── types.ts
│   │   └── utils/
│   └── styles.css
└── public/                   # Static assets (favicon, icon)
```

## Deployment

```bash
npm run deploy
```

Or deploy manually to any Node.js hosting (Vercel, Railway, Fly.io, etc.) — just make sure to set the environment variables and expose the server URL.

## Tech Stack

- **[mcp-use](https://mcp-use.com)** — MCP server framework with widget support
- **React** + **Tailwind CSS** — Live debate widget
- **Zod** — Schema validation
- **Hono** — HTTP/SSE streaming
- **TypeScript** — End-to-end type safety

## License

MIT

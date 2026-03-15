import { agents } from "./agents.js";
import { debateStore } from "./debate-store.js";
import { callLLM } from "./llm.js";
import type { DebateResult, Message, Vote } from "./types.js";

export async function runDebate(question: string, debateId?: string): Promise<DebateResult> {
  const rounds: Message[][] = [];

  // === ROUND 1: Initial Proposals ===
  const round1 = await Promise.all(
    agents.map(async (agent) => {
      const content = await callLLM(
        agent.provider,
        agent.model,
        agent.systemPrompt,
        `The council has been asked the following question:\n\n"${question}"\n\nProvide your initial proposal/answer to this question.`
      );
      const message = { agentId: agent.id, content, round: 1 } as Message;
      if (debateId) debateStore.addMessage(debateId, message);
      return message;
    })
  );
  rounds.push(round1);
  if (debateId) debateStore.completeRound(debateId, 1);

  // === ROUND 2: Critique ===
  const allProposals = round1
    .map((m) => {
      const agent = agents.find((a) => a.id === m.agentId)!;
      return `${agent.emoji} ${agent.name} (${agent.role}):\n${m.content}`;
    })
    .join("\n\n---\n\n");

  const round2 = await Promise.all(
    agents.map(async (agent) => {
      const content = await callLLM(
        agent.provider,
        agent.model,
        agent.systemPrompt,
        `The council was asked: "${question}"\n\nHere are all initial proposals:\n\n${allProposals}\n\nNow critique at least 2 other proposals (identify specific flaws or weaknesses) and defend your own position. Be specific about whose proposals you're critiquing.`
      );
      const message = { agentId: agent.id, content, round: 2 } as Message;
      if (debateId) debateStore.addMessage(debateId, message);
      return message;
    })
  );
  rounds.push(round2);
  if (debateId) debateStore.completeRound(debateId, 2);

  // === ROUND 3: Counter-arguments & Refinement ===
  const allCritiques = round2
    .map((m) => {
      const agent = agents.find((a) => a.id === m.agentId)!;
      return `${agent.emoji} ${agent.name} (${agent.role}):\n${m.content}`;
    })
    .join("\n\n---\n\n");

  const round3 = await Promise.all(
    agents.map(async (agent) => {
      const myCritiquesReceived = round2
        .filter((m) => m.agentId !== agent.id && m.content.toLowerCase().includes(agent.name.toLowerCase()))
        .map((m) => {
          const critic = agents.find((a) => a.id === m.agentId)!;
          return `${critic.emoji} ${critic.name}: ${m.content}`;
        })
        .join("\n\n");

      const content = await callLLM(
        agent.provider,
        agent.model,
        agent.systemPrompt,
        `The council was asked: "${question}"\n\nHere are all critiques from Round 2:\n\n${allCritiques}\n\n${myCritiquesReceived ? `Critiques directed at you:\n${myCritiquesReceived}\n\n` : ""}Now provide your refined final answer. You may update your position based on valid criticisms, or counter-argue if you believe your original position stands. This is your final chance to make your case.`
      );
      const message = { agentId: agent.id, content, round: 3 } as Message;
      if (debateId) debateStore.addMessage(debateId, message);
      return message;
    })
  );
  rounds.push(round3);
  if (debateId) debateStore.completeRound(debateId, 3);

  // === ROUND 4: Voting ===
  const finalPositions = round3
    .map((m) => {
      const agent = agents.find((a) => a.id === m.agentId)!;
      return `${agent.emoji} ${agent.name} (${agent.role}):\n${m.content}`;
    })
    .join("\n\n---\n\n");

  const otherAgentIds = (selfId: string) =>
    agents
      .filter((a) => a.id !== selfId)
      .map((a) => `"${a.id}" (${a.name})`)
      .join(", ");

  if (debateId) debateStore.setVoting(debateId);

  const voteResults = await Promise.all(
    agents.map(async (agent) => {
      const content = await callLLM(
        agent.provider,
        agent.model,
        agent.systemPrompt,
        `The council was asked: "${question}"\n\nHere are the final refined positions:\n\n${finalPositions}\n\nYou must now vote for the BEST answer. You CANNOT vote for yourself (${agent.id}). Choose from: ${otherAgentIds(agent.id)}.\n\nRespond with ONLY valid JSON in this exact format:\n{"votedForId": "<agent_id>", "reason": "<1-2 sentence reason>"}\n\nDo not include any other text.`
      );
      return { agentId: agent.id, raw: content };
    })
  );

  const votes: Vote[] = voteResults.map(({ agentId, raw }) => {
    let vote: Vote;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      const votedForId = parsed.votedForId || parsed.voted_for_id || parsed.vote;
      const validIds = agents.filter((a) => a.id !== agentId).map((a) => a.id);
      vote = {
        voterId: agentId,
        votedForId: validIds.includes(votedForId) ? votedForId : validIds[0],
        reason: parsed.reason || "No reason provided",
      };
    } catch {
      const validIds = agents.filter((a) => a.id !== agentId).map((a) => a.id);
      vote = {
        voterId: agentId,
        votedForId: validIds[0],
        reason: "Vote parsing failed - default vote assigned",
      };
    }
    if (debateId) debateStore.addVote(debateId, vote);
    return vote;
  });

  // Count votes
  const voteCounts = new Map<string, number>();
  for (const vote of votes) {
    voteCounts.set(vote.votedForId, (voteCounts.get(vote.votedForId) || 0) + 1);
  }

  // Find winner (handle ties)
  const maxVotes = Math.max(...voteCounts.values());
  const topCandidates = [...voteCounts.entries()]
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);

  let winnerId: string;
  if (topCandidates.length === 1) {
    winnerId = topCandidates[0];
  } else {
    // Tiebreaker: second round of voting among tied candidates
    const tieVotes = await Promise.all(
      agents.map(async (agent) => {
        const tiedNames = topCandidates
          .filter((id) => id !== agent.id)
          .map((id) => `"${id}" (${agents.find((a) => a.id === id)!.name})`)
          .join(", ");

        if (!tiedNames) return { agentId: agent.id, votedForId: topCandidates[0] };

        const content = await callLLM(
          agent.provider,
          agent.model,
          agent.systemPrompt,
          `Tiebreaker vote! Choose the best among these tied candidates: ${tiedNames}.\n\nRespond with ONLY the agent_id you vote for, nothing else.`
        );

        const votedForId = topCandidates.find((id) => content.includes(id)) || topCandidates[0];
        return { agentId: agent.id, votedForId };
      })
    );

    const tieCounts = new Map<string, number>();
    for (const tv of tieVotes) {
      tieCounts.set(tv.votedForId, (tieCounts.get(tv.votedForId) || 0) + 1);
    }
    winnerId = [...tieCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  const winnerFinal = round3.find((m) => m.agentId === winnerId);
  const winnerSummary = winnerFinal?.content || "No summary available";

  if (debateId) debateStore.complete(debateId, winnerId, winnerSummary);

  return {
    question,
    agents,
    rounds,
    votes,
    winnerId,
    winnerSummary,
  };
}

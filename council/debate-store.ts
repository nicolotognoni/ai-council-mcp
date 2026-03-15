import type { DebateEvent, LiveDebateState, Message, Vote } from "./types.js";

type Listener = (event: DebateEvent) => void;

class DebateStore {
  private states = new Map<string, LiveDebateState>();
  private listeners = new Map<string, Set<Listener>>();
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

  createDebate(id: string): void {
    this.states.set(id, {
      status: "running",
      currentRound: 1,
      messages: [],
      votes: [],
    });
    this.listeners.set(id, new Set());
  }

  getState(id: string): LiveDebateState | undefined {
    return this.states.get(id);
  }

  addMessage(id: string, msg: Message): void {
    const state = this.states.get(id);
    if (!state) return;
    state.messages.push(msg);
    state.currentRound = msg.round;
    this.emit(id, {
      type: "agent-response",
      agentId: msg.agentId,
      round: msg.round,
      content: msg.content,
    });
  }

  completeRound(id: string, round: number): void {
    this.emit(id, { type: "round-complete", round });
  }

  setVoting(id: string): void {
    const state = this.states.get(id);
    if (state) state.status = "voting";
  }

  addVote(id: string, vote: Vote): void {
    const state = this.states.get(id);
    if (!state) return;
    state.votes.push(vote);
    this.emit(id, {
      type: "vote-cast",
      voterId: vote.voterId,
      votedForId: vote.votedForId,
      reason: vote.reason,
    });
  }

  complete(id: string, winnerId: string, winnerSummary: string): void {
    const state = this.states.get(id);
    if (!state) return;
    state.status = "complete";
    state.winnerId = winnerId;
    state.winnerSummary = winnerSummary;
    this.emit(id, { type: "debate-complete", winnerId, winnerSummary });

    // Auto-cleanup after 5 minutes
    this.cleanupTimers.set(
      id,
      setTimeout(() => {
        this.states.delete(id);
        this.listeners.delete(id);
        this.cleanupTimers.delete(id);
      }, 5 * 60 * 1000)
    );
  }

  subscribe(id: string, listener: Listener): void {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(listener);
  }

  unsubscribe(id: string, listener: Listener): void {
    this.listeners.get(id)?.delete(listener);
  }

  private emit(id: string, event: DebateEvent): void {
    const set = this.listeners.get(id);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }
}

export const debateStore = new DebateStore();

export function hashQuestion(q: string): string {
  let hash = 5381;
  for (let i = 0; i < q.length; i++) {
    hash = ((hash << 5) + hash) + q.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

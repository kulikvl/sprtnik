export interface LearningProgressState {
  /** All card IDs available for learning */
  allCardIds: number[];
  /** Queue of remaining card IDs to learn */
  queueCardIds: number[];
}

export class LearningProgressStore {
  private static readonly STORAGE_KEY = 'learning-progress';
  private state: LearningProgressState;

  public constructor() {
    this.state = this.loadState();
  }

  private loadState() {
    const raw = localStorage.getItem(LearningProgressStore.STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as LearningProgressState;
      } catch {
        // corrupted data: fall through to reset
      }
    }
    const initial: LearningProgressState = { allCardIds: [], queueCardIds: [] };
    this.saveState(initial);
    return initial;
  }

  private saveState(state: LearningProgressState) {
    this.state = state;
    localStorage.setItem(LearningProgressStore.STORAGE_KEY, JSON.stringify(this.state));
  }

  public get allCardIds() {
    return [...this.state.allCardIds];
  }

  public get queueCardIds() {
    return [...this.state.queueCardIds];
  }

  public addToQueue(cardId: number, toFront = false) {
    if (!this.state.queueCardIds.includes(cardId)) {
      const updated = toFront
        ? [cardId, ...this.state.queueCardIds]
        : [...this.state.queueCardIds, cardId];
      this.saveState({
        ...this.state,
        queueCardIds: updated,
      });
    }
  }

  public popNext() {
    const [first, ...rest] = this.state.queueCardIds;
    this.saveState({
      ...this.state,
      queueCardIds: rest,
    });
    return first;
  }

  public reset(allCardIds: number[]) {
    this.saveState({ allCardIds, queueCardIds: [...allCardIds] });
  }

  public getStats() {
    const total = this.state.allCardIds.length;
    const remaining = this.state.queueCardIds.length;
    return {
      total,
      remaining,
      done: total - remaining,
    };
  }
}

export const learningProgressStore = new LearningProgressStore();

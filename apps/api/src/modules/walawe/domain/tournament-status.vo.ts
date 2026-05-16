export type TournamentStatusValue = 'draft' | 'published' | 'running' | 'completed' | 'cancelled';

export class TournamentStatus {
  private constructor(public readonly value: TournamentStatusValue) {}

  static draft(): TournamentStatus {
    return new TournamentStatus('draft');
  }

  static published(): TournamentStatus {
    return new TournamentStatus('published');
  }

  static running(): TournamentStatus {
    return new TournamentStatus('running');
  }

  static completed(): TournamentStatus {
    return new TournamentStatus('completed');
  }

  static cancelled(): TournamentStatus {
    return new TournamentStatus('cancelled');
  }

  static from(value: string): TournamentStatus {
    if (value === 'draft') return TournamentStatus.draft();
    if (value === 'published') return TournamentStatus.published();
    if (value === 'running') return TournamentStatus.running();
    if (value === 'completed') return TournamentStatus.completed();
    if (value === 'cancelled') return TournamentStatus.cancelled();
    throw new TournamentStatusError(`Unsupported tournament status: ${value}`);
  }

  isDraft(): boolean {
    return this.value === 'draft';
  }

  isPublished(): boolean {
    return this.value === 'published';
  }

  isRunning(): boolean {
    return this.value === 'running';
  }

  isCompleted(): boolean {
    return this.value === 'completed';
  }

  isCancelled(): boolean {
    return this.value === 'cancelled';
  }
}

export class TournamentStatusError extends Error {
  override readonly name = 'TournamentStatusError';
}

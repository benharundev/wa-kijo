export type TournamentFormatValue = 'swiss' | 'round-robin' | 'knockout';

export class TournamentFormat {
  private constructor(public readonly value: TournamentFormatValue) {}

  static swiss(): TournamentFormat {
    return new TournamentFormat('swiss');
  }

  static roundRobin(): TournamentFormat {
    return new TournamentFormat('round-robin');
  }

  static knockout(): TournamentFormat {
    return new TournamentFormat('knockout');
  }

  static from(value: string): TournamentFormat {
    if (value === 'swiss') return TournamentFormat.swiss();
    if (value === 'round-robin') return TournamentFormat.roundRobin();
    if (value === 'knockout') return TournamentFormat.knockout();
    throw new TournamentFormatError(`Unsupported tournament format: ${value}`);
  }

  isSwiss(): boolean {
    return this.value === 'swiss';
  }
}

export class TournamentFormatError extends Error {
  override readonly name = 'TournamentFormatError';
}

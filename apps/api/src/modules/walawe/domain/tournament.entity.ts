import { TimeRange } from '@wa-kijo/booking-core';
import { TournamentNotAllowedError } from './errors/tournament-not-allowed.error';
import { TournamentFormat } from './tournament-format.vo';
import { TournamentStatus } from './tournament-status.vo';

export interface TournamentSection {
  readonly id: string;
  readonly name: string;
}

export class Tournament {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly range: TimeRange,
    public readonly format: TournamentFormat,
    public readonly sections: readonly TournamentSection[],
    private _status: TournamentStatus,
  ) {}

  static create(params: {
    id: string;
    organizationId: string;
    name: string;
    range: TimeRange;
    format?: TournamentFormat;
    sections?: readonly TournamentSection[];
  }): Tournament {
    const name = params.name.trim();
    if (name.length === 0) {
      throw new TournamentNotAllowedError('Tournament name cannot be empty');
    }
    if (params.organizationId.trim().length === 0) {
      throw new TournamentNotAllowedError('Tournament must belong to an organization');
    }

    const sections = params.sections ?? [{ id: 'open', name: 'Open' }];
    if (sections.length === 0) {
      throw new TournamentNotAllowedError('Tournament must have at least one section');
    }

    return new Tournament(
      params.id,
      params.organizationId,
      name,
      params.range,
      params.format ?? TournamentFormat.swiss(),
      sections,
      TournamentStatus.draft(),
    );
  }

  static rehydrate(params: {
    id: string;
    organizationId: string;
    name: string;
    range: TimeRange;
    format: TournamentFormat;
    sections: readonly TournamentSection[];
    status: TournamentStatus;
  }): Tournament {
    return new Tournament(
      params.id,
      params.organizationId,
      params.name,
      params.range,
      params.format,
      params.sections,
      params.status,
    );
  }

  get status(): TournamentStatus {
    return this._status;
  }

  publish(): void {
    if (!this._status.isDraft()) {
      throw new TournamentNotAllowedError(
        `Only draft tournaments can be published; current state: ${this._status.value}`,
      );
    }
    this._status = TournamentStatus.published();
  }

  start(): void {
    if (!this._status.isPublished()) {
      throw new TournamentNotAllowedError(
        `Only published tournaments can start; current state: ${this._status.value}`,
      );
    }
    this._status = TournamentStatus.running();
  }

  complete(): void {
    if (!this._status.isRunning()) {
      throw new TournamentNotAllowedError(
        `Only running tournaments can be completed; current state: ${this._status.value}`,
      );
    }
    this._status = TournamentStatus.completed();
  }

  cancel(): void {
    if (this._status.isCompleted()) {
      throw new TournamentNotAllowedError('Completed tournaments cannot be cancelled');
    }
    this._status = TournamentStatus.cancelled();
  }
}

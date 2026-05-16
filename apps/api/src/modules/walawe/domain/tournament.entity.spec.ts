import { describe, expect, it } from 'vitest';
import { TimeRange } from '@wa-kijo/booking-core';
import { TournamentNotAllowedError } from './errors/tournament-not-allowed.error';
import { Tournament } from './tournament.entity';

const range = TimeRange.of('2026-06-01T01:00:00.000Z', '2026-06-01T10:00:00.000Z');

describe('Tournament — creation invariants', () => {
  it('rejects an empty name', () => {
    expect(() =>
      Tournament.create({
        id: 't_1',
        organizationId: 'org_a',
        name: ' ',
        range,
      }),
    ).toThrow(TournamentNotAllowedError);
  });

  it('rejects an empty organization', () => {
    expect(() =>
      Tournament.create({
        id: 't_1',
        organizationId: '',
        name: 'KIP Mall Open 2026',
        range,
      }),
    ).toThrow(TournamentNotAllowedError);
  });

  it('creates a draft Swiss tournament with a default Open section', () => {
    const tournament = Tournament.create({
      id: 't_1',
      organizationId: 'org_a',
      name: 'KIP Mall Open 2026',
      range,
    });

    expect(tournament.name).toBe('KIP Mall Open 2026');
    expect(tournament.status.isDraft()).toBe(true);
    expect(tournament.format.isSwiss()).toBe(true);
    expect(tournament.sections).toEqual([{ id: 'open', name: 'Open' }]);
  });
});

describe('Tournament — lifecycle transitions', () => {
  it('publishes a draft tournament', () => {
    const tournament = Tournament.create({
      id: 't_1',
      organizationId: 'org_a',
      name: 'KIP Mall Open 2026',
      range,
    });

    tournament.publish();

    expect(tournament.status.isPublished()).toBe(true);
  });

  it('runs only after publishing', () => {
    const tournament = Tournament.create({
      id: 't_1',
      organizationId: 'org_a',
      name: 'KIP Mall Open 2026',
      range,
    });

    expect(() => tournament.start()).toThrow(TournamentNotAllowedError);

    tournament.publish();
    tournament.start();

    expect(tournament.status.isRunning()).toBe(true);
  });

  it('completes only a running tournament', () => {
    const tournament = Tournament.create({
      id: 't_1',
      organizationId: 'org_a',
      name: 'KIP Mall Open 2026',
      range,
    });

    expect(() => tournament.complete()).toThrow(TournamentNotAllowedError);

    tournament.publish();
    tournament.start();
    tournament.complete();

    expect(tournament.status.isCompleted()).toBe(true);
  });

  it('does not cancel a completed tournament', () => {
    const tournament = Tournament.create({
      id: 't_1',
      organizationId: 'org_a',
      name: 'KIP Mall Open 2026',
      range,
    });

    tournament.publish();
    tournament.start();
    tournament.complete();

    expect(() => tournament.cancel()).toThrow(TournamentNotAllowedError);
  });
});

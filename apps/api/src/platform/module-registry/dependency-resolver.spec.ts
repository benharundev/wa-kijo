import { describe, it, expect } from 'vitest';
import {
  resolveDependencyOrder,
  satisfies,
  DependencyResolutionError,
} from './dependency-resolver';
import type { ModuleManifest } from '@wa-kijo/shared';

const m = (
  slug: string,
  version: string,
  dependencies: Record<string, string> = {},
): ModuleManifest =>
  ({
    slug,
    name: slug,
    version,
    description: `${slug} module`,
    dependencies,
    exposes: { permissions: [], hooks: [], customFields: [], uiSlots: [], routes: [] },
    config: { schema: {}, defaults: {} },
    lifecycle: {},
  }) as ModuleManifest;

describe('satisfies — semver range matching', () => {
  it('accepts caret ranges within the same major', () => {
    expect(satisfies('1.2.3', '^1.0.0')).toBe(true);
    expect(satisfies('1.9.9', '^1.0.0')).toBe(true);
    expect(satisfies('2.0.0', '^1.0.0')).toBe(false);
  });

  it('caret on 0.x locks to the same minor (npm behaviour)', () => {
    expect(satisfies('0.1.5', '^0.1.0')).toBe(true);
    expect(satisfies('0.2.0', '^0.1.0')).toBe(false);
  });

  it('accepts tilde ranges within the same minor', () => {
    expect(satisfies('1.2.3', '~1.2.0')).toBe(true);
    expect(satisfies('1.3.0', '~1.2.0')).toBe(false);
  });

  it('accepts >= ranges', () => {
    expect(satisfies('2.5.0', '>= 1.0.0')).toBe(true);
    expect(satisfies('0.9.0', '>= 1.0.0')).toBe(false);
  });

  it('accepts exact versions', () => {
    expect(satisfies('1.2.3', '1.2.3')).toBe(true);
    expect(satisfies('1.2.4', '1.2.3')).toBe(false);
  });

  it('* matches anything', () => {
    expect(satisfies('1.2.3', '*')).toBe(true);
    expect(satisfies('99.0.0', '*')).toBe(true);
  });
});

describe('resolveDependencyOrder', () => {
  it('returns a single module trivially', () => {
    expect(resolveDependencyOrder([m('a', '1.0.0')])).toEqual(['a']);
  });

  it('orders independent modules deterministically (alpha)', () => {
    expect(resolveDependencyOrder([m('z', '1.0.0'), m('a', '1.0.0')])).toEqual([
      'a',
      'z',
    ]);
  });

  it('places a dependency before its dependent', () => {
    const order = resolveDependencyOrder([
      m('b', '1.0.0', { a: '^1.0.0' }),
      m('a', '1.0.0'),
    ]);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
  });

  it('handles a diamond dependency', () => {
    // a -> b, a -> c, both b and c -> d
    const order = resolveDependencyOrder([
      m('d', '1.0.0'),
      m('b', '1.0.0', { d: '^1.0.0' }),
      m('c', '1.0.0', { d: '^1.0.0' }),
      m('a', '1.0.0', { b: '^1.0.0', c: '^1.0.0' }),
    ]);
    expect(order.indexOf('d')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('d')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('a'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('a'));
  });

  it('detects a missing dependency', () => {
    expect(() =>
      resolveDependencyOrder([m('a', '1.0.0', { ghost: '^1.0.0' })]),
    ).toThrow(DependencyResolutionError);
  });

  it('detects an incompatible version', () => {
    try {
      resolveDependencyOrder([
        m('a', '1.0.0', { b: '^2.0.0' }),
        m('b', '1.0.0'),
      ]);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DependencyResolutionError);
      const e = err as DependencyResolutionError;
      expect(e.reason).toBe('incompatible');
      expect(e.module).toBe('a');
    }
  });

  it('accepts external package versions for kernel deps', () => {
    expect(() =>
      resolveDependencyOrder(
        [m('a', '1.0.0', { '@wa-kijo/booking-core': '^0.1.0' })],
        { '@wa-kijo/booking-core': '0.1.0' },
      ),
    ).not.toThrow();
  });

  it('rejects an external dep when no version is supplied', () => {
    expect(() =>
      resolveDependencyOrder([
        m('a', '1.0.0', { '@wa-kijo/booking-core': '^0.1.0' }),
      ]),
    ).toThrow(DependencyResolutionError);
  });

  it('detects a cycle', () => {
    try {
      resolveDependencyOrder([
        m('a', '1.0.0', { b: '^1.0.0' }),
        m('b', '1.0.0', { a: '^1.0.0' }),
      ]);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DependencyResolutionError);
      expect((err as DependencyResolutionError).reason).toBe('cycle');
    }
  });
});

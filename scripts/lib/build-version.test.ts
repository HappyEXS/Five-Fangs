import { describe, expect, it } from 'vitest';
import { createBuildVersion, resolveCommit } from './build-version.ts';

const SHA = '5c1b596a0f3e4d2c8b7a6f5e4d3c2b1a09f8e7d6';
const noGit = () => null;

describe('resolveCommit', () => {
  it('bierze commit ze zmiennej hostingu przed lokalnym gitem', () => {
    expect(resolveCommit({ RENDER_GIT_COMMIT: SHA }, () => 'abcdef1')).toBe(SHA);
    expect(resolveCommit({ GITHUB_SHA: SHA }, noGit)).toBe(SHA);
    expect(resolveCommit({ CF_PAGES_COMMIT_SHA: SHA }, noGit)).toBe(SHA);
  });

  it('sięga do gita, gdy zmiennych nie ma, i normalizuje zapis', () => {
    expect(resolveCommit({}, () => `${SHA.toUpperCase()}\n`)).toBe(SHA);
  });

  it('pomija wartości, które nie wyglądają jak skrót commita', () => {
    expect(resolveCommit({ RENDER_GIT_COMMIT: '', GITHUB_SHA: 'main' }, () => 'abcdef1')).toBe(
      'abcdef1',
    );
  });

  it('zwraca "unknown", gdy nic nie jest dostępne', () => {
    expect(resolveCommit({}, noGit)).toBe('unknown');
    expect(resolveCommit({}, () => 'fatal: not a git repository')).toBe('unknown');
  });
});

describe('createBuildVersion', () => {
  it('składa wersję, commit i datę w UTC', () => {
    const build = createBuildVersion(
      '0.1.0',
      { GITHUB_SHA: SHA },
      noGit,
      new Date('2026-10-02T10:00:00Z'),
    );
    expect(build).toEqual({ version: '0.1.0', commit: SHA, builtAt: '2026-10-02T10:00:00.000Z' });
  });
});

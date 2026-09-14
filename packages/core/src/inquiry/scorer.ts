import type { Task } from '@/_base.js';

import { expandAliases } from './aliases.js';
import { similarity } from './fuzzy.js';
import { stem } from './stemmer.js';
import { tokenize } from './tokenizer.js';
import type {
  InquiryOptions,
  InquiryResult,
  RelevanceSignal,
  WeightConfig,
} from './types.js';

const DEFAULT_WEIGHTS: WeightConfig = {
  config: 0.1,
  group: 0.1,
  id: 0.25,
  keywords: 0.2,
  label: 0.35,
};

type MatchTier = 0.0 | 0.55 | 0.75 | 0.85 | 0.95 | 1.0;

/** Alias-derived matches are discounted so a direct hit outranks them. */
const ALIAS_DISCOUNT = 0.85;

/** Reserved score for a multi-word query that exactly matches a keyword. */
const PHRASE_SCORE = 0.85;

/** astryx-style exact whole-phrase promotion above alias-only token paths. */
function matchesPhrase(task: Task, phrase: string): boolean {
  return (task.searchMeta?.keywords ?? []).some(
    (keyword) => tokenize(keyword).tokens.join(' ').toLowerCase() === phrase
  );
}

function bestMatchTier(
  token: string,
  field: string | Array<string> | undefined,
  requireContainment = false
): MatchTier {
  if (!field) {
    return 0.0;
  }
  if (Array.isArray(field)) {
    let best: MatchTier = 0.0;
    for (const item of field) {
      const tier = bestMatchTier(token, item, requireContainment);
      if (tier > best) {
        best = tier;
      }
      if (best === 1.0) {
        break;
      }
    }
    return best;
  }
  const lowerToken = token.toLowerCase();
  const lowerField = field.toLowerCase();

  if (lowerToken === lowerField) {
    return 1.0;
  }
  if (stem(lowerToken) === stem(lowerField)) {
    return 0.95;
  }
  if (similarity(lowerToken, lowerField) >= 0.85) {
    return 0.85;
  }
  if (
    lowerField.startsWith(lowerToken) ||
    lowerField.includes(`${lowerToken} `)
  ) {
    return 0.75;
  }
  if (lowerField.includes(lowerToken)) {
    // Alias containment: the shorter side must carry at least half the field
    // and be meaningful on its own, so "lint" does not match "oxlint.config".
    const shorter = Math.min(lowerToken.length, lowerField.length);
    if (
      requireContainment &&
      (shorter < 4 || shorter / lowerField.length < 0.5)
    ) {
      return 0.0;
    }
    return 0.55;
  }
  return 0.0;
}

/** Query token at full tier, then its aliases discounted and containment-gated. */
function bestTermMatch(
  terms: Array<string>,
  field: string | Array<string> | undefined
): number {
  const [token, ...aliases] = terms;
  const direct = bestMatchTier(token, field);
  return direct === 1.0
    ? direct
    : Math.max(
        direct,
        ...aliases.map((a) => bestMatchTier(a, field, true) * ALIAS_DISCOUNT)
      );
}

function matchTaskToToken(terms: Array<string>, task: Task) {
  const [config, group, id, keywords, label] = [
    task.searchMeta?.configTargets ?? task.searchMeta?.tags,
    task.group,
    task.id.replace(/\//g, ' '),
    task.searchMeta?.keywords,
    task.label,
  ].map((field) => bestTermMatch(terms, field));
  return { config, group, id, keywords, label };
}

type TokenMatch = ReturnType<typeof matchTaskToToken>;

function maxSignal(match: TokenMatch): number {
  return Math.max(
    match.label,
    match.id,
    match.group,
    match.keywords,
    match.config
  );
}

function scoreTaskForQuery(
  task: Task,
  queryTerms: {
    expansions: Map<string, Array<string>>;
    tokens: Array<string>;
    weights: WeightConfig;
  }
): { signals: Array<RelevanceSignal>; score: number } {
  const { expansions, tokens, weights } = queryTerms;
  const matches = new Map<string, TokenMatch>();
  for (const [token, terms] of expansions) {
    matches.set(token, matchTaskToToken(terms, task));
  }

  // Best match per signal across all query tokens.
  const best = { config: 0, group: 0, id: 0, keywords: 0, label: 0 };
  for (const match of matches.values()) {
    best.label = Math.max(best.label, match.label);
    best.id = Math.max(best.id, match.id);
    best.group = Math.max(best.group, match.group);
    best.keywords = Math.max(best.keywords, match.keywords);
    best.config = Math.max(best.config, match.config);
  }

  // Coverage bonus: proportion of original tokens that matched >= 0.55 on any signal
  const matchedTokenCount = tokens.filter((t) => {
    const match = matches.get(t);
    return match !== undefined && maxSignal(match) >= 0.55;
  }).length;
  const coverageBonus =
    tokens.length > 0 ? (matchedTokenCount / tokens.length) * 0.1 : 0;

  const signals: Array<RelevanceSignal> = [
    { name: 'label', score: best.label },
    { name: 'id', score: best.id },
    { name: 'group', score: best.group },
    { name: 'keywords', score: best.keywords },
    { name: 'config', score: best.config },
  ];

  const weightedScore =
    best.label * weights.label +
    best.id * weights.id +
    best.group * weights.group +
    best.keywords * weights.keywords +
    best.config * weights.config +
    coverageBonus;

  return { score: Math.min(1.0, Math.max(0, weightedScore)), signals };
}

export function scoreTasks(
  tasks: Array<Task>,
  query: string,
  options?: InquiryOptions
): Array<InquiryResult> {
  if (!query?.trim()) {
    return [];
  }

  const {
    minScore = 0,
    maxResults = 0,
    weights: customWeights,
  } = options ?? {};
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  const { tokens } = tokenize(query);
  if (tokens.length === 0) {
    return [];
  }
  const phrase = tokens.join(' ').toLowerCase();
  const expansions = new Map<string, Array<string>>();
  for (const token of new Set(tokens)) {
    expansions.set(token, [token, ...expandAliases(token)]);
  }

  const results: Array<InquiryResult> = [];

  for (const task of tasks) {
    const { signals, score } = scoreTaskForQuery(task, {
      expansions,
      tokens,
      weights,
    });
    const relevance =
      tokens.length > 1 && matchesPhrase(task, phrase)
        ? Math.max(score, PHRASE_SCORE)
        : score;
    if (relevance > minScore) {
      results.push({ relevance, signals, task, taskId: task.id });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  return maxResults > 0 ? results.slice(0, maxResults) : results;
}

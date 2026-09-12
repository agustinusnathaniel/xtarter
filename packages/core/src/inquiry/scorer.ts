import type { Task } from '@/_base.js';

import { similarity } from './fuzzy.js';
import { stem } from './stemmer.js';
import { expandQuery } from './synonyms.js';
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

function bestMatchTier(token: string, field: string | undefined): MatchTier {
  if (!field) {
    return 0.0;
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
    return 0.55;
  }
  return 0.0;
}

function bestMatchInArray(
  token: string,
  arr: Array<string> | undefined
): MatchTier {
  if (!arr || arr.length === 0) {
    return 0.0;
  }
  let best: MatchTier = 0.0;
  for (const item of arr) {
    const match = bestMatchTier(token, item);
    if (match > best) {
      best = match;
    }
    if (best === 1.0) {
      break;
    }
  }
  return best;
}

function matchTaskToToken(token: string, task: Task) {
  return {
    config: bestMatchInArray(
      token,
      task.searchMeta?.configTargets ?? task.searchMeta?.tags
    ),
    group: bestMatchTier(token, task.group),
    id: bestMatchTier(token, task.id.replace(/\//g, ' ')),
    keywords: bestMatchInArray(token, task.searchMeta?.keywords),
    label: bestMatchTier(token, task.label),
  };
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
    tokens: Array<string>;
    expanded: Array<string>;
    weights: WeightConfig;
  }
): { signals: Array<RelevanceSignal>; score: number } {
  const { tokens, expanded, weights } = queryTerms;
  const matches = new Map<string, TokenMatch>();
  for (const term of new Set([...tokens, ...expanded])) {
    matches.set(term, matchTaskToToken(term, task));
  }

  // Best match per signal across all terms (original + synonyms).
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

  const expanded = expandQuery(tokens);
  const results: Array<InquiryResult> = [];

  for (const task of tasks) {
    const { signals, score } = scoreTaskForQuery(task, {
      expanded,
      tokens,
      weights,
    });
    if (score > minScore) {
      results.push({ relevance: score, signals, task, taskId: task.id });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  return maxResults > 0 ? results.slice(0, maxResults) : results;
}

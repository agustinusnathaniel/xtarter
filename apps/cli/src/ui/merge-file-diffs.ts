import type { FileDiff } from "@xtarterize/core";
import { patchJson } from "@xtarterize/patchers";

export function mergeFileDiffs(diffs: FileDiff[]): FileDiff[] {
  const grouped = new Map<string, FileDiff[]>();
  for (const diff of diffs) {
    const list = grouped.get(diff.filepath) ?? [];
    list.push(diff);
    grouped.set(diff.filepath, list);
  }

  const merged: FileDiff[] = [];
  for (const [filepath, list] of grouped) {
    if (list.length === 1) {
      merged.push(list[0]);
      continue;
    }

    if (filepath.endsWith(".json") || filepath.endsWith(".jsonc") || filepath.endsWith(".json5")) {
      const first = list.find((d) => d.before !== null);
      const before = first?.before ?? list[0].before;
      let after = before ?? "{}";
      for (const diff of list) {
        try {
          after = patchJson(after, JSON.parse(diff.after));
        } catch {
          after = diff.after;
        }
      }
      merged.push({ filepath, before, after });
      continue;
    }

    merged.push(list[list.length - 1]);
  }

  return merged;
}

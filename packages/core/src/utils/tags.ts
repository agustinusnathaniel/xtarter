import pc from 'picocolors';

const STATUS_TAGS: Record<string, (text: string) => string> = {
  conflict: (text) => pc.bgRed(pc.white(text)),
  new: (text) => pc.bgGreen(pc.black(text)),
  patch: (text) => pc.bgYellow(pc.black(text)),
  skip: (text) => pc.dim(text),
};

export function statusTag(status: string): string {
  const padded = ` ${status} `;
  return STATUS_TAGS[status]?.(padded) ?? padded;
}

/** Diff actions reuse the status colors: create as new, modify as patch. */
const ACTION_STATUSES: Record<string, string> = {
  create: 'new',
  modify: 'patch',
};

export function actionTag(action: string): string {
  const padded = ` ${action} `;
  return STATUS_TAGS[ACTION_STATUSES[action] ?? '']?.(padded) ?? padded;
}

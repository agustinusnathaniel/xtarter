import pc from 'picocolors';

export type TagColor =
  | 'green'
  | 'yellow'
  | 'red'
  | 'blue'
  | 'cyan'
  | 'magenta'
  | 'white'
  | 'dim';

export function tag(text: string, color: TagColor): string {
  const padded = ` ${text} `;
  switch (color) {
    case 'green':
      return pc.bgGreen(pc.black(padded));
    case 'yellow':
      return pc.bgYellow(pc.black(padded));
    case 'red':
      return pc.bgRed(pc.white(padded));
    case 'blue':
      return pc.bgBlue(pc.white(padded));
    case 'cyan':
      return pc.bgCyan(pc.black(padded));
    case 'magenta':
      return pc.bgMagenta(pc.white(padded));
    case 'white':
      return pc.bgWhite(pc.black(padded));
    case 'dim':
      return pc.dim(padded);
  }
}

const STATUS_COLORS: Record<string, TagColor> = {
  conflict: 'red',
  new: 'green',
  patch: 'yellow',
  skip: 'dim',
};

export function statusTag(status: string): string {
  const color = STATUS_COLORS[status];
  return color ? tag(status, color) : ` ${status} `;
}

const ACTION_COLORS: Record<string, TagColor> = {
  create: 'green',
  modify: 'yellow',
};

export function actionTag(action: string): string {
  const color = ACTION_COLORS[action];
  return color ? tag(action, color) : ` ${action} `;
}

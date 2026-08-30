export function resolveCwd(args: {
  cwd?: string;
  _?: Array<string | number>;
}): string {
  if (typeof args.cwd === 'string') {
    return args.cwd;
  }
  return process.cwd();
}

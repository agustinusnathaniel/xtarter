import { pc } from '@xtarterize/core';
import Table from 'cli-table3';

export const CLI_TABLE_CHARS = {
  bottom: '─',
  'bottom-left': '└',
  'bottom-mid': '┴',
  'bottom-right': '┘',
  left: '│',
  'left-mid': '├',
  mid: '─',
  'mid-mid': '┼',
  middle: '│',
  right: '│',
  'right-mid': '┤',
  top: '─',
  'top-left': '┌',
  'top-mid': '┬',
  'top-right': '┐',
} as const;

/** A borderless cli-table3 table using the shared xtarterize characters. */
export function createCliTable(...head: Array<string>): Table.Table {
  return new Table({
    chars: CLI_TABLE_CHARS,
    head: head.map((label) => pc.bold(label)),
    style: { border: [], head: [] },
  });
}

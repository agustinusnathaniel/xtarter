import { pc } from '@xtarterize/core';
import Table from 'cli-table3';

/** A borderless cli-table3 table with bold headers. */
export function createCliTable(...head: Array<string>): Table.Table {
  return new Table({
    head: head.map((label) => pc.bold(label)),
    style: { border: [], head: [] },
  });
}

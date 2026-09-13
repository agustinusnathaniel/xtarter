import { type ProjectProfile, pc } from '@xtarterize/core';

export function printProjectProfile(profile: ProjectProfile): void {
  console.log('');
  console.log(`${pc.bold(`Framework: ${profile.framework ?? 'none'}`)}`);
  console.log(`${pc.bold(`Bundler: ${profile.bundler ?? 'none'}`)}`);
  console.log(`${pc.bold(`Package Manager: ${profile.packageManager}`)}`);
  console.log('');
}

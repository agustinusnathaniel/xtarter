/**
 * Effect-free entry point for non-Effect consumers.
 *
 * Every module re-exported here must stay free of `effect`, directly or
 * through its import graph (for example `@/errors.js`), so apps such as
 * `create-xtarter-app` can use the plain helpers without bundling the
 * orchestration engine. The root entry remains the full, Effect-based API.
 */
export { findFirstPositionalIndex } from '@/cli-args.js';
export { createInvocationGuard } from '@/invocation-guard.js';
export { fileExists } from '@/utils/file-exists.js';
export { consola, logWarn, pc } from '@/utils/logger.js';
export { abortIfCancelled } from '@/utils/prompts.js';

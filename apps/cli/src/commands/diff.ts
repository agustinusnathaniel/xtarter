import { spinner } from "@clack/prompts";
import {
  detectProject,
  type FileDiff,
  logSuccess,
  pc,
  resolveTaskStatuses,
  resolveTasks,
  runPreflight,
} from "@xtarterize/core";
import { getAllTasks } from "@xtarterize/tasks";
import { defineCommand } from "citty";
import { displayDiffs } from "@/ui/diff-display.js";
import { mergeFileDiffs } from "@/ui/merge-file-diffs.js";
import { resolveCwd } from "@/utils/cwd.js";

export const diffCommand = defineCommand({
  meta: {
    name: "diff",
    description: "Show pending changes without applying",
  },
  args: {
    quiet: {
      type: "boolean",
      description: "Suppress verbose output",
    },
  },
  async run({ args }) {
    const cwd = resolveCwd(args);
    const isCI = process.env.CI === "true" || process.env.CI === "1";
    const quiet = args.quiet || isCI;

    const preflight = await runPreflight(cwd);
    if (!preflight.valid) {
      console.log("");
      console.log(`${pc.red("✖")} Preflight checks failed`);
      console.log("");
      for (const error of preflight.errors) {
        console.log(`${pc.red(`  ✗ ${error.message}`)}`);
        if (error.hint) {
          console.log(`  ${pc.dim(error.hint)}`);
        }
      }
      console.log("");
      process.exit(1);
    }

    const s = spinner();
    if (!quiet) s.start("Scanning project...");

    const profile = await detectProject(cwd);
    if (!quiet) s.stop("Project scanned");

    const allTasks = getAllTasks();
    const tasks = resolveTasks(profile, allTasks);
    const statuses = await resolveTaskStatuses(tasks, cwd, profile);

    const diffs: FileDiff[] = [];
    for (const task of tasks) {
      const status = statuses.get(task.id);
      if (status === "new" || status === "patch") {
        const taskDiffs = await task.dryRun(cwd, profile);
        diffs.push(...taskDiffs);
      }
    }

    if (diffs.length === 0) {
      logSuccess("No pending changes");
      return;
    }

    displayDiffs(mergeFileDiffs(diffs));
  },
});

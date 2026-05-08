import type { FileDiff, ProjectProfile, Task, TaskStatus } from "@xtarterize/core";
import { fileExists, readFile, readPackageJson, resolvePath } from "@xtarterize/core";
import { x } from "tinyexec";

interface SkillEntry {
  source: string;
  skill: string;
}

interface SkillDefinition {
  source: string;
  skill: string;
  condition: (profile: ProjectProfile, deps: Record<string, string>) => boolean;
}

function hasDep(deps: Record<string, string>, dep: string): boolean {
  return dep in deps;
}

function hasAnyDep(deps: Record<string, string>, depNames: string[]): boolean {
  return depNames.some((dep) => hasDep(deps, dep));
}

function getAllDeps(pkg: Record<string, unknown>): Record<string, string> {
  const deps: Record<string, string> = {};
  if (
    typeof pkg.dependencies === "object" &&
    pkg.dependencies !== null &&
    !Array.isArray(pkg.dependencies)
  ) {
    Object.assign(deps, pkg.dependencies as Record<string, string>);
  }
  if (
    typeof pkg.devDependencies === "object" &&
    pkg.devDependencies !== null &&
    !Array.isArray(pkg.devDependencies)
  ) {
    Object.assign(deps, pkg.devDependencies as Record<string, string>);
  }
  return deps;
}

/** Declarative catalog of all installable skills, grouped by category.
 *
 *  To add a new skill, append an entry with its source, skill name, and a
 *  `condition` that returns `true` when the project stack matches.
 */
const SKILL_CATALOG: SkillDefinition[] = [
  // ═════════════════════════════════════════════════════════════════
  //  Frontend / UI
  // ═════════════════════════════════════════════════════════════════
  {
    source: "anthropics/skills",
    skill: "frontend-design",
    condition: (p) => p.runtime === "browser" || p.runtime === "edge",
  },
  {
    source: "vercel-labs/agent-skills",
    skill: "web-design-guidelines",
    condition: (p) => p.runtime === "browser" || p.runtime === "edge",
  },
  {
    source: "ibelick/ui-skills",
    skill: "baseline-ui",
    condition: (p) => p.runtime === "browser" || p.runtime === "edge",
  },
  {
    source: "ibelick/ui-skills",
    skill: "fixing-accessibility",
    condition: (p) => p.runtime === "browser" || p.runtime === "edge",
  },
  {
    source: "ibelick/ui-skills",
    skill: "fixing-metadata",
    condition: (p) => p.runtime === "browser" || p.runtime === "edge",
  },
  {
    source: "ibelick/ui-skills",
    skill: "fixing-motion-performance",
    condition: (p) => p.runtime === "browser" || p.runtime === "edge",
  },

  // ═════════════════════════════════════════════════════════════════
  //  React
  // ═════════════════════════════════════════════════════════════════
  {
    source: "vercel-labs/agent-skills",
    skill: "vercel-react-best-practices",
    condition: (p) => p.framework === "react",
  },
  {
    source: "vercel-labs/agent-skills",
    skill: "vercel-composition-patterns",
    condition: (p) => p.framework === "react",
  },
  {
    source: "softaworks/agent-toolkit",
    skill: "react-dev",
    condition: (p) => p.framework === "react",
  },
  {
    source: "softaworks/agent-toolkit",
    skill: "react-useeffect",
    condition: (p) => p.framework === "react",
  },

  // ═════════════════════════════════════════════════════════════════
  //  Next.js
  // ═════════════════════════════════════════════════════════════════
  {
    source: "vercel-labs/next-skills",
    skill: "next-best-practices",
    condition: (p) => p.bundler === "nextjs",
  },
  {
    source: "vercel-labs/next-skills",
    skill: "next-cache-components",
    condition: (p) => p.bundler === "nextjs",
  },
  {
    source: "vercel-labs/next-skills",
    skill: "next-upgrade",
    condition: (p) => p.bundler === "nextjs",
  },

  // ═════════════════════════════════════════════════════════════════
  //  Vue / Nuxt
  // ═════════════════════════════════════════════════════════════════
  {
    source: "antfu/skills",
    skill: "vue",
    condition: (p) => p.framework === "vue",
  },
  {
    source: "antfu/skills",
    skill: "vue-best-practices",
    condition: (p) => p.framework === "vue",
  },
  {
    source: "antfu/skills",
    skill: "nuxt",
    condition: (_p, d) => hasDep(d, "nuxt"),
  },

  // ═════════════════════════════════════════════════════════════════
  //  Shadcn
  // ═════════════════════════════════════════════════════════════════
  {
    source: "shadcn/ui",
    skill: "shadcn",
    condition: (_p, d) => hasAnyDep(d, ["shadcn", "shadcn-ui", "@shadcn/ui", "@shadcn-ui/cli"]),
  },

  // ═════════════════════════════════════════════════════════════════
  //  Ultracite
  // ═════════════════════════════════════════════════════════════════
  {
    source: "haydenbleasel/ultracite",
    skill: "ultracite",
    condition: (_p, d) => hasDep(d, "ultracite"),
  },

  // ═════════════════════════════════════════════════════════════════
  //  Component Libraries
  // ═════════════════════════════════════════════════════════════════
  {
    source: "ant-design/ant-design-cli",
    skill: "antd",
    condition: (_p, d) => hasDep(d, "antd"),
  },
  {
    source: "heroui-inc/heroui",
    skill: "heroui-react",
    condition: (_p, d) => hasDep(d, "@heroui/react"),
  },
  {
    source: "chakra-ui/chakra-ui",
    skill: "chakra-ui-builder",
    condition: (_p, d) => hasDep(d, "@chakra-ui/react"),
  },
  {
    source: "chakra-ui/chakra-ui",
    skill: "chakra-ui-refactor",
    condition: (_p, d) => hasDep(d, "@chakra-ui/react"),
  },

  // ═════════════════════════════════════════════════════════════════
  //  Expo / React Native
  // ═════════════════════════════════════════════════════════════════
  {
    source: "expo/skills",
    skill: "expo-tailwind-setup",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "expo/skills",
    skill: "expo-cicd-workflows",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "expo/skills",
    skill: "expo-deployment",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "expo/skills",
    skill: "expo-dev-client",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "expo/skills",
    skill: "building-native-ui",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "expo/skills",
    skill: "native-data-fetching",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "expo/skills",
    skill: "expo-module",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "expo/skills",
    skill: "upgrading-expo",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "vercel-labs/agent-skills",
    skill: "vercel-react-native-skills",
    condition: (p) => p.bundler === "expo" || p.framework === "react-native",
  },
  {
    source: "heroui-inc/heroui",
    skill: "heroui-native",
    condition: (_p, d) => hasDep(d, "heroui-native") && hasDep(d, "react-native"),
  },

  // ═════════════════════════════════════════════════════════════════
  //  Build / Dev tools
  // ═════════════════════════════════════════════════════════════════
  {
    source: "antfu/skills",
    skill: "vite",
    condition: (p, d) => p.bundler === "vite" || hasDep(d, "vite"),
  },
  {
    source: "antfu/skills",
    skill: "vitest",
    condition: (_p, d) => hasDep(d, "vitest"),
  },
  {
    source: "antfu/skills",
    skill: "tsdown",
    condition: (_p, d) => hasDep(d, "tsdown"),
  },
  {
    source: "vercel/turborepo",
    skill: "turborepo",
    condition: (p) => p.monorepoTool === "turbo" || p.existing.turbo,
  },

  // ═════════════════════════════════════════════════════════════════
  //  Database / Auth
  // ═════════════════════════════════════════════════════════════════
  {
    source: "supabase/agent-skills",
    skill: "supabase-postgres-best-practices",
    condition: (_p, d) => hasAnyDep(d, ["@supabase/supabase-js", "supabase", "pg", "postgres"]),
  },
  {
    source: "ccheney/robust-skills",
    skill: "postgres-drizzle",
    condition: (_p, d) => hasDep(d, "drizzle-orm"),
  },
  {
    source: "mindrally/skills",
    skill: "redis-best-practices",
    condition: (_p, d) => hasAnyDep(d, ["redis", "ioredis"]),
  },
  {
    source: "better-auth/skills",
    skill: "better-auth-best-practices",
    condition: (_p, d) => hasDep(d, "better-auth"),
  },
  {
    source: "better-auth/skills",
    skill: "create-auth-skill",
    condition: (_p, d) => hasDep(d, "better-auth"),
  },

  // ═════════════════════════════════════════════════════════════════
  //  AI / SDKs
  // ═════════════════════════════════════════════════════════════════
  {
    source: "vercel/ai",
    skill: "ai-sdk",
    condition: (_p, d) => hasDep(d, "ai"),
  },

  // ═════════════════════════════════════════════════════════════════
  //  Media / Specialized
  // ═════════════════════════════════════════════════════════════════
  {
    source: "remotion-dev/skills",
    skill: "remotion-best-practices",
    condition: (_p, d) => hasAnyDep(d, ["remotion", "@remotion/cli"]),
  },
];

function getSkillsToInstall(profile: ProjectProfile, deps: Record<string, string>): SkillEntry[] {
  return SKILL_CATALOG.filter((s) => s.condition(profile, deps)).map((s) => ({
    source: s.source,
    skill: s.skill,
  }));
}

async function readSkillLockFile(lockPath: string): Promise<Set<string>> {
  const installed = new Set<string>();
  if (!(await fileExists(lockPath))) return installed;

  try {
    const content = await readFile(lockPath);
    const lock = JSON.parse(content) as {
      skills?: Record<string, unknown>;
    };
    if (lock.skills && typeof lock.skills === "object") {
      for (const name of Object.keys(lock.skills)) {
        installed.add(name);
      }
    }
  } catch {
    // ignore parse errors
  }

  return installed;
}

async function isDirNonEmpty(dirPath: string): Promise<boolean> {
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dirPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function readSkillsFromDir(skillsDir: string): Promise<Set<string>> {
  const installed = new Set<string>();
  if (!(await fileExists(skillsDir))) return installed;

  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = resolvePath(skillsDir, entry.name);
        const hasContent = await isDirNonEmpty(skillPath);
        if (hasContent) {
          installed.add(entry.name);
        }
      }
    }
  } catch {
    // ignore read errors
  }

  return installed;
}

async function getInstalledSkills(cwd: string): Promise<Set<string>> {
  // Check project-local skill directories first
  const projectDirs = [
    resolvePath(cwd, ".agents", "skills"),
    resolvePath(cwd, ".claude", "skills"),
    resolvePath(cwd, ".cursor", "skills"),
  ];

  const skillDirsWithContent = new Set<string>();
  for (const dir of projectDirs) {
    const skills = await readSkillsFromDir(dir);
    for (const s of skills) skillDirsWithContent.add(s);
  }

  // Validate lock file entries against actual directories
  const lockPath = resolvePath(cwd, "skills-lock.json");
  const lockSkills = await readSkillLockFile(lockPath);

  const installed = new Set<string>();
  // Only count lock file entries if they have actual content in the directory
  for (const s of lockSkills) {
    if (skillDirsWithContent.has(s)) {
      installed.add(s);
    }
  }
  // Also include any directory skills not in lock file (but only if they have content)
  for (const s of skillDirsWithContent) {
    installed.add(s);
  }

  return installed;
}

function groupBySource(skills: SkillEntry[]): Map<string, string[]> {
  const grouped = new Map<string, Set<string>>();
  for (const { source, skill } of skills) {
    const existing = grouped.get(source) ?? new Set<string>();
    existing.add(skill);
    grouped.set(source, existing);
  }

  const normalized = new Map<string, string[]>();
  for (const [source, skillSet] of grouped) {
    normalized.set(source, [...skillSet]);
  }
  return normalized;
}

function formatCommands(skills: SkillEntry[]): string {
  const grouped = groupBySource(skills);
  const lines: string[] = [];
  for (const [source, skillNames] of grouped) {
    const skillFlags = skillNames.map((s) => `--skill ${s}`).join(" ");
    lines.push(`npx skills@latest add ${source} ${skillFlags}`);
  }
  return lines.join("\n");
}

export const skillsInstallTask: Task = {
  id: "agent/skills-install",
  label: "Install agent skills",
  group: "Agent",

  applicable: (profile) => profile.typescript,

  async check(cwd, profile): Promise<TaskStatus> {
    const pkg = await readPackageJson(cwd);
    const deps = pkg ? getAllDeps(pkg as Record<string, unknown>) : {};
    const skills = getSkillsToInstall(profile, deps);

    if (skills.length === 0) return "skip";

    const installed = await getInstalledSkills(cwd);
    const missing = skills.filter((s) => !installed.has(s.skill));

    if (missing.length === 0) return "skip";
    if (missing.length === skills.length) return "new";
    return "patch";
  },

  async dryRun(cwd, profile): Promise<FileDiff[]> {
    const pkg = await readPackageJson(cwd);
    const deps = pkg ? getAllDeps(pkg as Record<string, unknown>) : {};
    const skills = getSkillsToInstall(profile, deps);

    if (skills.length === 0) return [];

    const installed = await getInstalledSkills(cwd);
    const missing = skills.filter((s) => !installed.has(s.skill));

    if (missing.length === 0) return [];

    return [
      {
        filepath: ".xtarterize/skills-install.log",
        before: null,
        after: `# Skills to install (${missing.length} of ${skills.length}):\n${formatCommands(missing)}\n`,
      },
    ];
  },

  async apply(cwd, profile): Promise<void> {
    const pkg = await readPackageJson(cwd);
    const deps = pkg ? getAllDeps(pkg as Record<string, unknown>) : {};
    const skills = getSkillsToInstall(profile, deps);

    if (skills.length === 0) return;

    const installed = await getInstalledSkills(cwd);
    const missing = skills.filter((s) => !installed.has(s.skill));

    const grouped = groupBySource(missing);
    for (const [source, skillNames] of grouped) {
      const args = [
        "skills@latest",
        "add",
        source,
        ...skillNames.flatMap((s) => ["--skill", s]),
        "-y",
      ];
      const result = await x("npx", args, {
        nodeOptions: { cwd, stdio: "inherit" },
      });
      if (result.exitCode !== 0) {
        throw new Error(`Failed to install skills from ${source}: ${skillNames.join(", ")}`);
      }
    }
  },
};

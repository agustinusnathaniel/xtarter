/**
 * Minimal project profile — a subset of @xtarterize/core's ProjectProfile.
 *
 * Only the fields that skill conditions actually inspect are declared here
 * so the catalog package stays dependency-free while remaining structurally
 * compatible with the richer core profile.
 */
export interface SkillProfile {
	runtime: string
	framework: string | null
	bundler: string | null
	monorepoTool: string | null
	typescript: boolean
	existing: {
		turbo: boolean
	}
}

/**
 * A resolved skill entry — source + name, no condition.
 */
export interface SkillEntry {
	source: string
	skill: string
}

/**
 * A catalog entry with a condition that decides whether the skill applies.
 */
export interface SkillDefinition {
	source: string
	skill: string
	condition: (profile: SkillProfile, deps: Record<string, string>) => boolean
}

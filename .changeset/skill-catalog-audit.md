---
'@xtarterize/tasks': patch
---

Fix stale entries in the skill catalog (`packages/tasks/src/agent/catalog.ts`) so `xtarterize` scaffolds install skills that actually exist upstream:

- `expo/skills`: replace 5 renamed skills (`expo-cicd-workflows` → `eas-workflows`, `expo-deployment` → `eas-app-stores`, `building-native-ui` → `expo-native-ui`, `native-data-fetching` → `expo-data-fetching`, `upgrading-expo` → `expo-upgrade`) and drop `expo-tailwind-setup`, which has no upstream equivalent.
- Add `expo-overview` (gated on an `expo` bundler/dependency, per upstream guidance that bare React Native is not Expo work), `expo-router`, and `eas-update` for Expo projects.
- `mattpocock/skills`: `writing-great-skills` → `writing-for-agents` (old skill removed upstream).
- `better-auth/skills`: `create-auth-skill` → `create-auth` (matches upstream `SKILL.md` frontmatter name).
- `shadcn/ui` source → `shadcn-ui/ui` (repo renamed upstream).

# TASK-01: Project Audit & Configuration Cleanup

## Objective
Audit the existing codebase, configure git remote safely to prevent modifying Daidar repo, and establish clean configuration baseline for ITQAN Quran Academy.

## Existing Code to Reuse
- Next.js 14 App Router structure
- Tailwind CSS setup
- i18n routing (`[locale]`) and translation dictionaries (`src/locales/`)

## Implementation Steps
1. Audit all files and packages in the project.
2. Confirm git remote is pointing to `https://github.com/khaleddaidar012/itqn_acadmy.git`.
3. Clean up obsolete assets and prepare directories for ITQAN branding.

## Files to Inspect
- `package.json`
- `.git/config`
- `src/locales/`
- `src/styles/globals.css`

## Files to Modify
- `.git/config`

## Files to Create
- `tasks/` specification files

## Subtasks
- [x] Check package dependencies and scripts
- [x] Verify Git remote points to itqn_acadmy
- [x] Create project task tracking files

## Status
DONE

## Conventional Commit Message
`chore: audit codebase and configure itqan academy repository remote`

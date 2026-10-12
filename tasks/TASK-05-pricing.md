# TASK-05: Centralized Regional Pricing Architecture

## Objective
Extract and centralize exact pricing data from the authentic academy references.
- Egypt (EGP):
  * Memorization: 30m (4: 200, 8: 350, 12: 500 EGP), 45m (4: 275, 8: 500, 12: 700 EGP), 60m (4: 350, 8: 750, 12: 950 EGP).
  * Tajweed: 30m (8: 400, 12: 550, 16: 700 EGP), 45m (4: 275, 8: 500, 12: 700 EGP), 60m (8: 800, 12: 1100, 16: 1400 EGP).
- International (USD):
  * 30m: 1 Student $40/mo, 2 Students $64/mo, 3 Students $120/mo (or 3-Month Plan $28/mo).
  * 60m: 1 Student $80/mo, 2 Students $128/mo, 3 Students $240/mo.

## Subtasks
- [ ] Create `src/data/pricing.ts` with centralized typed structures
- [ ] Implement category tabs: Quran Memorization, Tajweed Course, International Classes
- [ ] Display presentation tiers (Silver / الفضية, Gold / الذهبية, Premium / المميزة)
- [ ] Package card selector with duration, sessions, students, monthly prices

## Status
TODO

## Conventional Commit Message
`feat(pricing): add centralized regional pricing data and interactive package cards`

# TASK-08: 2-Minute Confirmation Timer & WhatsApp Direct Handoff

## Objective
Implement:
1. 120-second countdown timer after user clicks "Initiate Transfer", storing start timestamp to prevent accidental resets.
2. Button "تم التحويل" / "Transfer Done" enabled strictly after 120 seconds.
3. On click, opens official WhatsApp with the formatted, URL-encoded message containing all subscription details.

## Official Academy WhatsApp
- Number: `+201277622042` (Vodafone Cash & confirmed mobile)

## Subtasks
- [ ] Implement robust 120-second countdown timer hook/component
- [ ] Compose exact prefilled Arabic and English WhatsApp templates
- [ ] Open WhatsApp window with `encodeURIComponent` payload

## Status
TODO

## Conventional Commit Message
`feat(timer-whatsapp): add 2-minute confirmation countdown and prefilled whatsapp handoff`

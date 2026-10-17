# Continuous Multi-Language Localization Rule

## Core Requirement
Every task in the **Unending Void** codebase must be designed and written with full multi-language localization in mind.

## Supported Locales
1. **English (US)** — `en`
2. **Turkish (TR)** — `tr`
3. **German (DE)** — `de`

## Rules & Coding Standards
1. **Never Hardcode User-Facing Text:** All new buttons, labels, headings, modal text, toast notifications, badges, tooltips, and roll notices must use i18n translation keys via `useTranslation()` or support multilingual object schemas `{ en: "...", tr: "...", de: "..." }`.
2. **Data & Seed Items:** Any catalog items, traits, starship components, weapon descriptions, and lore documents must provide text in all three languages (`en`, `tr`, `de`).
3. **Language Switching Consistency:** When the user switches language via the `LanguageSwitcher` (`EN`, `TR`, `DE`), all UI elements across the character sheet, ship console, market terminal, and roll ledger must dynamically update to the active locale without requiring a page reload.
4. **Fallback Handling:** If a key is missing in a secondary locale, it must gracefully fallback to English (`en`) without crashing or showing blank labels.

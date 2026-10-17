# AGENTS.md — Unending Void Agent Directives

## 🌐 Continuous Multi-Language Localization Mandate (MANDATORY)

> **CRITICAL DIRECTIVE:** Every feature, UI screen, component, modal, banner, notification, button, and data model implemented in **Unending Void** MUST be built with full multi-language localization in mind across three primary locales:
> 1. **Turkish (TR)** — `tr`
> 2. **English (US)** — `en`
> 3. **German (DE)** — `de`

### Rules for All Future Tasks:
1. **Zero Hardcoded Strings in UI**: Never embed raw English, Turkish, or German strings directly inside JSX elements. Always use `useTranslation()` (`t('key')`) or provide localized schema objects (`{ en: "...", tr: "...", de: "..." }`).
2. **Synchronized Locales**: When adding or modifying keys in `src/locales/en/common.json`, immediately provide the equivalent translations in `src/locales/tr/common.json` and `src/locales/de/common.json`.
3. **Data Schemas & Catalog Items**: All game items, starship modules, weapons, traits, and descriptions created in catalogs, seed files, or Firestore models must provide multi-language text fields (`{ en, tr, de }`).
4. **Dynamic Language Switcher**: The active language must switch dynamically between `🇺🇸 EN`, `🇹🇷 TR`, and `🇩🇪 DE` without requiring a page reload, immediately updating the entire active view (character sheet, ship builder, E.E.Sys marketplace, dice HUD, etc.).
5. **Fallback Safety**: If a key is missing in a secondary locale, `i18next` must fall back to `en` gracefully without crashing or rendering blank buttons.

---

## 🚀 Architecture & Coding Standards
- **Framework**: React 19 + Vite + Tailwind CSS.
- **State Management & Backend**: Firebase Firestore & Auth with emulator fallbacks.
- **Unit Testing**: Vitest (`npm test`). Every feature, math validation engine, and state transition must include comprehensive tests.
- **Visual Aesthetics**: Cyberpunk/Sci-Fi high-contrast theme (`bg-[#050814]`, neon cyan `#00F0FF`, neon purple `#A855F7`, amber `#F59E0B`, neon green `#10B981`). Glassmorphism panels, crisp typography, and responsive layouts.

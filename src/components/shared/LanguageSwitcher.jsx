import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English (US)', flag: '🇺🇸' },
  { code: 'tr', label: 'Türkçe (TR)', flag: '🇹🇷' },
  { code: 'de', label: 'Deutsch (DE)', flag: '🇩🇪' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  return (
    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
      {LANGUAGES.map((lang) => {
        const isActive = currentLang.startsWith(lang.code);
        return (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1
                       ${isActive
                         ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                         : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <span>{lang.flag}</span>
            <span className="uppercase">{lang.code}</span>
          </button>
        );
      })}
    </div>
  );
}

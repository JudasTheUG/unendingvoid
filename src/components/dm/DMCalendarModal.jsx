import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  parseGameTime,
  serializeGameTime,
  formatGameDateTime,
  advanceGameTime,
  advanceGameDays,
  MONTH_NAMES,
} from '../../lib/calendarUtils';

export default function DMCalendarModal({ isOpen, onClose, currentGameTime, onSave }) {
  const { t, i18n } = useTranslation();
  const activeLocale = i18n.language || 'en';

  const [year, setYear] = useState(2381);
  const [month, setMonth] = useState(5);
  const [day, setDay] = useState(18);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const d = parseGameTime(currentGameTime);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
      setHour(d.getHours());
      setMinute(d.getMinutes());
    }
  }, [isOpen, currentGameTime]);

  if (!isOpen) return null;

  const currentPreviewDate = new Date(year, month - 1, day, hour, minute);
  const currentPreviewStr = serializeGameTime(currentPreviewDate);
  const formattedPreview = formatGameDateTime(currentPreviewStr, activeLocale);

  const applyOffsetHours = (hours) => {
    const updatedStr = advanceGameTime(currentPreviewStr, hours);
    const d = parseGameTime(updatedStr);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setDay(d.getDate());
    setHour(d.getHours());
    setMinute(d.getMinutes());
  };

  const applyOffsetDays = (days) => {
    const updatedStr = advanceGameDays(currentPreviewStr, days);
    const d = parseGameTime(updatedStr);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setDay(d.getDate());
    setHour(d.getHours());
    setMinute(d.getMinutes());
  };

  const handleSave = () => {
    onSave(currentPreviewStr);
    onClose();
  };

  const langKey = activeLocale.toLowerCase().slice(0, 2);
  const monthList = MONTH_NAMES[langKey] || MONTH_NAMES.en;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-mono"
    >
      <div className="relative max-w-2xl w-full bg-[#080d1a] border-2 border-amber-500/70 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.35)] space-y-6">
        {/* Header */}
        <div className="border-b border-amber-500/20 pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black text-amber-400 flex items-center gap-2 uppercase tracking-wider">
              <span>📅⏱️</span>
              <span>{t('calendar.manualTimeTitle', 'Galactic Calendar Chronometer')}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('calendar.manualTimeSubtitle', 'Adjust the campaign stardate and planetary clock')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl p-1 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Live Stardate Preview Banner */}
        <div className="bg-[#040711] border border-amber-400/40 rounded-xl p-4 text-center shadow-inner">
          <span className="text-[11px] uppercase tracking-widest text-amber-400/80 font-bold block mb-1">
            {t('calendar.stardate', 'Galactic Standard Time')}
          </span>
          <div className="text-lg sm:text-2xl font-bold text-white tracking-wider flex items-center justify-center gap-2.5 font-mono">
            <span className="text-xl sm:text-2xl">📅</span>
            <span className="text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
              {formattedPreview}
            </span>
          </div>
        </div>

        {/* Discrete Date & Time Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs">
          {/* Year (3 cols) */}
          <div className="sm:col-span-3 space-y-1.5">
            <label className="text-gray-400 font-bold uppercase block text-[11px] tracking-wider">
              {t('calendar.year', 'Year')}
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full bg-black/70 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Month (4 cols) */}
          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-gray-400 font-bold uppercase block text-[11px] tracking-wider">
              {t('calendar.month', 'Month')}
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full bg-black/70 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm outline-none cursor-pointer transition-colors"
            >
              {monthList.map((mName, idx) => (
                <option key={idx} value={idx + 1} className="bg-[#080d1a] text-white">
                  {idx + 1}. {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Day (2 cols) */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-gray-400 font-bold uppercase block text-[11px] tracking-wider">
              {t('calendar.day', 'Day')}
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(Math.max(1, Math.min(31, Number(e.target.value))))}
              className="w-full bg-black/70 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm text-center outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Time (Hour : Minute) (3 cols) */}
          <div className="sm:col-span-3 space-y-1.5">
            <label className="text-gray-400 font-bold uppercase block text-[11px] tracking-wider">
              {t('calendar.hour', 'Hour')} / {t('calendar.minute', 'Min')}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(Math.max(0, Math.min(23, Number(e.target.value))))}
                className="w-1/2 bg-black/70 border border-white/20 focus:border-amber-400 rounded-xl px-2 py-2 text-white font-mono font-bold text-sm text-center outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-amber-400 font-bold text-base select-none">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minute}
                onChange={(e) => setMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
                className="w-1/2 bg-black/70 border border-white/20 focus:border-amber-400 rounded-xl px-2 py-2 text-white font-mono font-bold text-sm text-center outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Increment Shortcuts */}
        <div className="space-y-2">
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">
            ⚡ Quick Tactical Adjustments
          </span>
          <div className="flex flex-wrap gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => applyOffsetHours(1)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-all font-semibold"
            >
              {t('calendar.plus1Hour', '+1 Hour')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetHours(2)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-all font-semibold"
            >
              {t('calendar.plus2Hours', '+2 Hours (Short Rest)')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetHours(8)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-all font-semibold"
            >
              {t('calendar.plus8Hours', '+8 Hours (Long Rest)')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetDays(1)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-all font-semibold"
            >
              {t('calendar.plus1Day', '+1 Day')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetDays(7)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-all font-semibold"
            >
              {t('calendar.plus7Days', '+7 Days')}
            </button>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
          >
            {t('calendar.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-display shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
          >
            {t('calendar.apply', 'Save Stardate')}
          </button>
        </div>
      </div>
    </div>
  );
}

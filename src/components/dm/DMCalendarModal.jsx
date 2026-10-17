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
      <div className="relative max-w-lg w-full bg-[#080d1a] border-2 border-amber-500/70 rounded-2xl p-6 shadow-[0_0_40px_rgba(245,158,11,0.35)] space-y-6">
        {/* Header */}
        <div className="border-b border-amber-500/20 pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-black text-amber-400 flex items-center gap-2 uppercase tracking-wider">
              <span>📅⏱️</span>
              <span>{t('calendar.manualTimeTitle', 'Galactic Calendar Chronometer')}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('calendar.manualTimeSubtitle', 'Adjust the campaign stardate and planetary clock')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Stardate Preview Banner */}
        <div className="bg-[#040711] border border-amber-400/40 rounded-xl p-3.5 text-center shadow-inner">
          <span className="text-[10px] uppercase tracking-widest text-amber-400/70 font-semibold block mb-1">
            {t('calendar.stardate', 'Galactic Standard Time')}
          </span>
          <div className="text-base sm:text-lg font-bold text-white tracking-wider flex items-center justify-center gap-2">
            <span>📅</span>
            <span className="text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">
              {formattedPreview}
            </span>
          </div>
        </div>

        {/* Discrete Date & Time Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {/* Year */}
          <div className="col-span-1 sm:col-span-1 space-y-1">
            <label className="text-gray-400 font-bold uppercase block text-[10px]">
              {t('calendar.year', 'Year')}
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-white font-bold outline-none"
            />
          </div>

          {/* Month */}
          <div className="col-span-2 sm:col-span-2 space-y-1">
            <label className="text-gray-400 font-bold uppercase block text-[10px]">
              {t('calendar.month', 'Month')}
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg px-2 py-1.5 text-white font-bold outline-none cursor-pointer"
            >
              {monthList.map((mName, idx) => (
                <option key={idx} value={idx + 1} className="bg-[#080d1a] text-white">
                  {idx + 1}. {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Day */}
          <div className="col-span-1 sm:col-span-1 space-y-1">
            <label className="text-gray-400 font-bold uppercase block text-[10px]">
              {t('calendar.day', 'Day')}
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(Math.max(1, Math.min(31, Number(e.target.value))))}
              className="w-full bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-white font-bold outline-none"
            />
          </div>

          {/* Time (Hour : Minute) */}
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <label className="text-gray-400 font-bold uppercase block text-[10px]">
              {t('calendar.hour', 'Hour')} / {t('calendar.minute', 'Min')}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(Math.max(0, Math.min(23, Number(e.target.value))))}
                className="w-1/2 bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg px-1.5 py-1.5 text-white font-bold text-center outline-none"
              />
              <span className="text-gray-500 font-bold">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minute}
                onChange={(e) => setMinute(Math.max(0, Math.min(59, Number(e.target.value))))}
                className="w-1/2 bg-black/60 border border-white/20 focus:border-amber-400 rounded-lg px-1.5 py-1.5 text-white font-bold text-center outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Increment Shortcuts */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            ⚡ Quick Tactical Adjustments
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => applyOffsetHours(1)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-colors"
            >
              {t('calendar.plus1Hour', '+1 Hour')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetHours(2)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-colors"
            >
              {t('calendar.plus2Hours', '+2 Hours (Short Rest)')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetHours(8)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-colors"
            >
              {t('calendar.plus8Hours', '+8 Hours (Long Rest)')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetDays(1)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-colors"
            >
              {t('calendar.plus1Day', '+1 Day')}
            </button>
            <button
              type="button"
              onClick={() => applyOffsetDays(7)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/50 transition-colors"
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
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
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

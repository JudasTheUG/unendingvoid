import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  { id: 'all', labelKey: 'notes.catAll', fallback: 'All Records', icon: '📂' },
  { id: 'personal', labelKey: 'notes.catPersonal', fallback: 'Field Logs', icon: '📝' },
  { id: 'saved_intel', labelKey: 'notes.catSavedIntel', fallback: 'Saved DM Intel', icon: '🛰️' },
  { id: 'military', labelKey: 'notes.catMilitary', fallback: 'Military Ops', icon: '🎖️' },
  { id: 'politics', labelKey: 'notes.catPolitics', fallback: 'Galactic Politics', icon: '🏛️' },
  { id: 'outlaw', labelKey: 'notes.catOutlaw', fallback: 'Underworld & Bounties', icon: '💀' },
];

export default function PlayerNotesTab({
  notes = [],
  onAddNote,
  onDeleteNote,
}) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  // New Note Form States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('personal');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'saved_intel' && n.type === 'saved_intel') ||
      (activeFilter === 'personal' && n.type !== 'saved_intel') ||
      (n.category && n.category.toLowerCase() === activeFilter.toLowerCase());

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (n.title && n.title.toLowerCase().includes(query)) ||
      (n.content && n.content.toLowerCase().includes(query)) ||
      (n.source && n.source.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });

  const handleCreateNote = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newNote = {
      id: `note_${Date.now()}`,
      type: 'custom',
      title: title.trim(),
      category,
      content: content.trim(),
      imageUrl: imageUrl.trim() || null,
      source: 'Operative Personal Log',
      createdAt: new Date().toISOString(),
    };

    if (onAddNote) onAddNote(newNote);

    setTitle('');
    setContent('');
    setImageUrl('');
    setIsComposing(false);
  };

  return (
    <div className="space-y-4 animate-fade-in font-mono text-xs">
      {/* Top Controls: Search, Filter, and Compose Button */}
      <div className="glass-panel p-4 space-y-3 border-l-4 border-l-neon-cyan">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-neon-cyan text-base">📑</span>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                {t('notes.title') || 'Operative Field Journal & Intel Archive'}
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {t('notes.subtitle') || 'Personal encrypted logs, intercepted communications, and saved DM intelligence dossiers.'}
            </p>
          </div>

          <button
            onClick={() => setIsComposing(!isComposing)}
            className="py-1.5 px-3.5 rounded-lg bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 font-bold uppercase text-[11px] tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0"
          >
            <span>{isComposing ? '✕' : '➕'}</span>
            <span>{isComposing ? (t('common.cancel') || 'Cancel') : (t('notes.compose') || 'New Field Note')}</span>
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const count =
                cat.id === 'all'
                  ? notes.length
                  : cat.id === 'saved_intel'
                    ? notes.filter((n) => n.type === 'saved_intel').length
                    : cat.id === 'personal'
                      ? notes.filter((n) => n.type !== 'saved_intel').length
                      : notes.filter((n) => n.category?.toLowerCase() === cat.id).length;

              const isActive = activeFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-all flex items-center gap-1 border
                             ${isActive
                               ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                               : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'}`}
                >
                  <span>{cat.icon}</span>
                  <span>{t(cat.labelKey) || cat.fallback}</span>
                  <span className="text-[9px] px-1 rounded bg-black/40 text-gray-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Filter Search */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              placeholder={t('notes.searchPlaceholder') || 'Search logs & intel...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-2.5 py-1 text-white placeholder-gray-500 text-xs focus:border-neon-cyan focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compose New Note Drawer */}
      {isComposing && (
        <form
          onSubmit={handleCreateNote}
          className="glass-panel p-5 space-y-3 border-2 border-neon-cyan/50 shadow-[0_0_20px_rgba(0,240,255,0.2)] animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-display text-xs font-bold text-neon-cyan uppercase tracking-wider">
              📝 {t('notes.newNoteHeader') || 'Encrypt New Field Note'}
            </span>
            <span className="text-[10px] text-gray-400">
              // ZERO-TRACE SECURE LOG //
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] text-gray-400 uppercase block mb-1">
                {t('notes.titleLabel') || 'Record Subject / Directive'}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ceres Black Market Fuel Prices"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white placeholder-gray-600 focus:border-neon-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">
                {t('notes.categoryLabel') || 'Classification'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white focus:border-neon-cyan focus:outline-none"
              >
                <option value="personal">📝 Field Note / Diary</option>
                <option value="military">🎖️ Military Operations</option>
                <option value="politics">🏛️ Galactic Politics</option>
                <option value="outlaw">💀 Outlaw / Underworld</option>
                <option value="intel">🛰️ Intercepted Intel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 uppercase block mb-1">
              {t('notes.contentLabel') || 'Field Notes & Observations'}
            </label>
            <textarea
              required
              rows={4}
              placeholder="Record operative notes, debts, suspicious NPC quotes, coordinates..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white placeholder-gray-600 focus:border-neon-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 uppercase block mb-1">
              {t('notes.imageUrlLabel') || 'Attached Surveillance Image URL (Optional)'}
            </label>
            <input
              type="url"
              placeholder="https://... (low-res surveillance still or blueprint)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white placeholder-gray-600 text-xs focus:border-neon-cyan focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="px-3 py-1.5 text-gray-400 hover:text-white"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan font-bold uppercase tracking-wider"
            >
              💾 {t('notes.saveNote') || 'Commit to Memory'}
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="glass-panel p-10 text-center text-gray-500 space-y-2 border-dashed">
          <span className="text-3xl block opacity-40">📭</span>
          <p className="text-sm font-bold text-gray-400">
            {t('notes.noNotesFound') || 'No archive records matching active classification.'}
          </p>
          <p className="text-[11px] text-gray-500 max-w-md mx-auto">
            {t('notes.emptyHint') || 'Use the "New Field Note" button above or click "Save to Notes" on incoming DM Tactical Intel transmissions.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const isSavedIntel = note.type === 'saved_intel';
            const catBadgeColor =
              note.category === 'military'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : note.category === 'politics'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : note.category === 'outlaw'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : isSavedIntel
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

            return (
              <div
                key={note.id}
                className={`glass-panel p-4 flex flex-col justify-between space-y-3 transition-all hover:border-slate-500
                           ${isSavedIntel ? 'border-l-4 border-l-neon-purple' : 'border-l-4 border-l-neon-cyan'}`}
              >
                <div className="space-y-2">
                  {/* Category & Date Header */}
                  <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1.5 text-[10px]">
                    <span className={`px-2 py-0.5 rounded uppercase font-bold border ${catBadgeColor}`}>
                      {isSavedIntel ? '🛰️ SAVED INTEL' : `📝 ${note.category || 'LOG'}`}
                    </span>
                    <span className="text-gray-400">
                      {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Title & Source */}
                  <div>
                    <h4 className="font-display text-sm font-bold text-white leading-snug">
                      {note.title}
                    </h4>
                    {note.source && (
                      <span className="text-[10px] text-neon-cyan/80 block mt-0.5">
                        Source: {note.source}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>

                  {/* Attached Image Thumbnail */}
                  {note.imageUrl && (
                    <div className="relative group overflow-hidden rounded border border-slate-700 bg-black/50">
                      <img
                        src={note.imageUrl}
                        alt={note.title}
                        className="w-full h-28 object-cover cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => setSelectedImage(note.imageUrl)}
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedImage(note.imageUrl)}
                        className="absolute bottom-1 right-1 bg-black/80 hover:bg-black text-[9px] text-neon-cyan px-2 py-0.5 rounded border border-neon-cyan/40"
                      >
                        🔍 Examine
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Footer: Delete Action */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">Ref: #{note.id.slice(-6)}</span>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this note from your personal archive?')) {
                        if (onDeleteNote) onDeleteNote(note);
                      }
                    }}
                    className="text-gray-400 hover:text-red-400 transition-colors uppercase font-bold"
                  >
                    🗑️ {t('common.delete') || 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl w-full bg-[#070b14] border-2 border-neon-cyan rounded-xl p-2 shadow-[0_0_50px_rgba(0,240,255,0.4)]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/80 text-white hover:text-neon-red px-3 py-1 rounded text-sm font-bold border border-white/20"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Archived Visual"
              className="w-full max-h-[80vh] object-contain rounded"
            />
            <div className="p-2 text-center text-xs font-mono text-neon-cyan">
              // ARCHIVED SURVEILLANCE VISUAL //
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export const DEFAULT_SAMPLE_INTEL = [
  {
    id: 'intel_mcrn_01',
    sender: 'MCRN NAVAL COMMAND',
    channel: 'Fleet High Comms',
    priority: 'FLASH',
    title: 'Epstein Drive Plume Detected // Sector 4',
    content: 'Long-range thermal sensors have identified an unregistered stealth frigate burn trajectory 40,000 km off Ceres orbital grid. All operatives report to combat readiness Alpha.',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    timestamp: '03:42:10 UTC',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'intel_syndicate_02',
    sender: 'UNDERWORLD BROKER',
    channel: 'Black Market Wire',
    priority: 'URGENT',
    title: 'Bounty Advisory: Void Runner "Red Horizon"',
    content: '5,000 Credits posted for salvage telemetry on hijacked Helium-3 freight containers in the Jovian shipping lane. Lethal force authorized by Martian authorities.',
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80',
    timestamp: '04:15:22 UTC',
    createdAt: Date.now() - 1800000,
  },
];

const LOCAL_STORAGE_KEY = 'unendingvoid:dm_broadcasts';

export function getStoredBroadcasts() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_SAMPLE_INTEL;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SAMPLE_INTEL;
  } catch (e) {
    return DEFAULT_SAMPLE_INTEL;
  }
}

export function saveLocalBroadcast(broadcast) {
  const current = getStoredBroadcasts();
  const updated = [broadcast, ...current].slice(0, 30);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('unendingvoid:new_broadcast', { detail: broadcast }));
  } catch (e) {
    console.error('Failed saving local broadcast', e);
  }
  return updated;
}

/**
 * IntelMediaPreview - Renders an inline surveillance image or a fallback tactical dossier card
 * for external links such as Pinterest pins (pin.it) and non-direct image URLs.
 */
function IntelMediaPreview({ url, title, onOpenLightbox }) {
  const { t } = useTranslation();
  const [loadFailed, setLoadFailed] = useState(false);
  const isPinterest = /pin\.it|pinterest\./i.test(url);

  if (loadFailed) {
    return (
      <div className="p-3 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-[#0a1120] to-[#070b14] space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
            <span>{isPinterest ? '📌' : '📎'}</span>
            <span>{isPinterest ? 'Pinterest Intel Attachment' : (t('intel.externalAttachment') || 'External Intel Dossier')}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/60 text-gray-400 border border-slate-700 text-[9px]">
            {isPinterest ? 'pinterest.com' : 'external comms'}
          </span>
        </div>
        <p className="text-[10px] text-gray-300">
          {isPinterest
            ? 'Surveillance still hosted on Pinterest. Tap below to access visual dossier.'
            : 'Attachment link is hosted externally on the comms grid.'}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-[11px] transition-all hover:scale-[1.02] shadow-[0_0_10px_rgba(245,158,11,0.2)]"
        >
          <span>{isPinterest ? '📌' : '↗'}</span>
          <span>{t('intel.openExternalIntel') || 'Open Visual Dossier ↗'}</span>
        </a>
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden rounded border border-slate-700 bg-black/60">
      <img
        src={url}
        alt={title}
        onError={() => setLoadFailed(true)}
        className="w-full h-32 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
        onClick={() => onOpenLightbox(url)}
        loading="lazy"
      />
      <div className="absolute bottom-1 right-1 flex items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="bg-black/80 hover:bg-black text-[9px] text-amber-400 px-2 py-0.5 rounded border border-amber-500/40"
          title="Open source link in new tab"
        >
          ↗ Link
        </a>
        <button
          type="button"
          onClick={() => onOpenLightbox(url)}
          className="bg-black/80 hover:bg-black text-[9px] text-neon-cyan px-2 py-0.5 rounded border border-neon-cyan/40"
        >
          🔍 {t('intel.viewImage') || 'Examine Intel'}
        </button>
      </div>
    </div>
  );
}

export default function DMIntelBroadcast({
  isDM = false,
  onSaveToNotes = null,
  activePlayer = null,
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState(getStoredBroadcasts());
  const [selectedImage, setSelectedImage] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [hasNewUnread, setHasNewUnread] = useState(false);

  // Sync broadcasts from Firestore (with local fallback)
  useEffect(() => {
    let unsubscribe = null;
    try {
      if (db) {
        const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(25));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const live = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
              setBroadcasts(live);
            }
          },
          (err) => {
            console.warn('[DMIntelBroadcast] Firestore sync error, using local fallback:', err.message);
          }
        );
      }
    } catch (e) {
      console.warn('[DMIntelBroadcast] Firestore listener failed:', e);
    }

    const handleCustomBroadcast = (e) => {
      setBroadcasts((prev) => [e.detail, ...prev.filter((b) => b.id !== e.detail.id)]);
      if (!isOpen) setHasNewUnread(true);
    };

    window.addEventListener('unendingvoid:new_broadcast', handleCustomBroadcast);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('unendingvoid:new_broadcast', handleCustomBroadcast);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    setHasNewUnread(false);
  };

  const handleSaveItem = (item) => {
    if (onSaveToNotes) {
      onSaveToNotes({
        id: `saved_intel_${item.id}_${Date.now()}`,
        type: 'saved_intel',
        refId: item.id,
        title: item.title,
        content: item.content,
        imageUrl: item.imageUrl || null,
        category: 'Intel',
        source: item.sender || 'DM Broadcast',
        createdAt: new Date().toISOString(),
      });
      setSavedIds((prev) => new Set([...prev, item.id]));
    }
  };

  return (
    <>
      {/* Floating Tactical Comms Toggle Button - Far Right Above Dice Bar with comfortable margin */}
      <div className="fixed bottom-24 right-5 z-40">
        <button
          onClick={handleOpen}
          className={`px-3.5 py-2.5 rounded-xl bg-[#070b14] border-2 transition-all font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(0,0,0,0.9)]
                     ${isOpen
                       ? 'border-amber-500 text-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                       : hasNewUnread
                         ? 'border-neon-cyan text-neon-cyan animate-pulse shadow-[0_0_20px_rgba(0,240,255,0.5)]'
                         : 'border-slate-700 text-gray-300 hover:text-white hover:border-slate-500 hover:bg-[#0e1628]'}`}
          title="Open DM Tactical Comms Feed"
        >
          <span className="text-base">📡</span>
          <span>{t('intel.feedTitle') || 'TAC-COMMS'}</span>
          {hasNewUnread && (
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping"></span>
          )}
          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-gray-200 border border-slate-700 font-bold">
            {broadcasts.length}
          </span>
        </button>
      </div>

      {/* 100% Opaque Tactical Intel Feed Panel - Expanded Size with clean margin above dice bar */}
      {isOpen && (
        <div className="fixed bottom-24 right-5 w-96 sm:w-[32rem] max-w-[calc(100vw-2.5rem)] max-h-[36rem] bg-[#070b14] p-4.5 z-50 shadow-[0_0_50px_rgba(0,0,0,0.98)] border-2 border-slate-700/90 rounded-xl animate-fade-in flex flex-col font-mono">
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-[#0d1424] -mx-4 -mt-4 p-3 mb-3 border-b-2 border-slate-700/90 rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-display text-xs text-white uppercase tracking-wider font-black">
                {t('intel.feedHeader') || '📡 Tactical Comms // DM Intel'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/60 text-slate-400 border border-slate-700">
                {t('intel.readOnly') || 'MONITOR ONLY'}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sub-header Notice */}
          <div className="text-[10px] text-gray-400 bg-[#0a0f1d] px-2.5 py-1.5 rounded border border-slate-800 mb-3 flex items-center justify-between">
            <span className="text-amber-400/90 font-bold uppercase">
              {t('intel.incomingNotice') || 'Incoming Fleet & Outlaw Transmissions'}
            </span>
            <span className="text-[9px] text-gray-500">
              {t('intel.noInputAllowed') || 'No transmission capability'}
            </span>
          </div>

          {/* Broadcasts List */}
          <div className="overflow-y-auto space-y-3 pr-1 text-xs">
            {broadcasts.length === 0 ? (
              <div className="text-center py-10 text-gray-500 space-y-1">
                <span className="text-2xl block opacity-40">🔇</span>
                <p>{t('intel.noBroadcasts') || 'Subspace comms frequency is silent.'}</p>
              </div>
            ) : (
              broadcasts.map((item) => {
                const isSaved = savedIds.has(item.id);
                const priorityColor =
                  item.priority === 'FLASH'
                    ? 'bg-red-500/20 text-red-400 border-red-500/50'
                    : item.priority === 'URGENT'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';

                return (
                  <div
                    key={item.id}
                    className="bg-[#0e1628] p-3 rounded-lg border border-slate-700/80 space-y-2 shadow-sm hover:border-slate-600 transition-colors"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 block tracking-wide">
                          {item.sender || 'DM INTEL'}
                        </span>
                        <span className="text-[9px] text-gray-400 block uppercase">
                          {item.channel || 'Fleet Broadcast'} · {item.timestamp || 'Recent'}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${priorityColor}`}>
                        {item.priority || 'STANDARD'}
                      </span>
                    </div>

                    {/* Title & Content */}
                    <div>
                      <h4 className="font-display text-xs font-bold text-white mb-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>

                    {/* Image Preview or Tactical External Attachment Card */}
                    {item.imageUrl && (
                      <IntelMediaPreview
                        url={item.imageUrl}
                        title={item.title}
                        onOpenLightbox={(img) => setSelectedImage(img)}
                      />
                    )}

                    {/* Save to Player Notes / Collection Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                      <span className="text-gray-500">Ref: #{item.id.slice(-6)}</span>
                      <button
                        onClick={() => handleSaveItem(item)}
                        disabled={isSaved}
                        className={`px-2.5 py-1 rounded font-bold uppercase transition-all flex items-center gap-1
                                   ${isSaved
                                     ? 'bg-neon-green/20 text-neon-green border border-neon-green/50'
                                     : 'bg-white/5 hover:bg-neon-cyan/20 text-gray-300 hover:text-neon-cyan border border-white/10 hover:border-neon-cyan/50'}`}
                        title="Save this briefing to your character's Field Notes"
                      >
                        <span>{isSaved ? '✓' : '📌'}</span>
                        <span>{isSaved ? (t('intel.saved') || 'Saved') : (t('intel.saveToNotes') || 'Save to Notes')}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in font-mono"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#070b14] border-2 border-neon-cyan rounded-xl p-3 shadow-[0_0_50px_rgba(0,240,255,0.4)] space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-neon-cyan tracking-wider">
                // RECON VISUAL ARCHIVE // SURVEILLANCE DOSSIER //
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-white/10 hover:bg-red-500/20 text-gray-300 hover:text-red-400 px-2.5 py-0.5 rounded text-xs font-bold border border-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Intel Visual"
              className="w-full max-h-[75vh] object-contain rounded bg-black/50"
            />
            <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
              <span className="truncate max-w-xs">{selectedImage}</span>
              <a
                href={selectedImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan hover:underline flex items-center gap-1 font-bold"
              >
                <span>↗</span>
                <span>{t('intel.openOriginal') || 'Open Original Link'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

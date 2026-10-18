import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getStoredBroadcasts, saveLocalBroadcast, IntelMediaPreview, BROADCAST_CHANNEL_NAME, LATEST_BROADCAST_KEY } from './DMIntelBroadcast';
import { getStoredRolls, useDiceSync } from '../../hooks/useDiceSync';

export default function CommsAndRollsFlow({
  isDM = false,
  user = null,
  profile = null,
  onSaveToNotes = null,
}) {
  const { t } = useTranslation();

  // ────────────────── TAC-COMMS STATE ──────────────────
  const [broadcasts, setBroadcasts] = useState(() => getStoredBroadcasts());
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [selectedImage, setSelectedImage] = useState(null);
  const [savedNoteIds, setSavedNoteIds] = useState(new Set());

  // DM In-Flow Quick Broadcast Drawer
  const [showDmBroadcaster, setShowDmBroadcaster] = useState(false);
  const [dmChannel, setDmChannel] = useState('FLEET COMMAND');
  const [dmPriority, setDmPriority] = useState('URGENT');
  const [dmTitle, setDmTitle] = useState('');
  const [dmContent, setDmContent] = useState('');
  const [dmImageUrl, setDmImageUrl] = useState('');
  const [dmIsSending, setDmIsSending] = useState(false);

  // ────────────────── QUANTUM ROLLS STATE ──────────────────
  const [rolls, setRolls] = useState(() => getStoredRolls());
  const [rollFilter, setRollFilter] = useState('ALL'); // 'ALL' | 'MINE'

  const currentUserId = user?.uid || 'guest';
  const isViewerDM = Boolean(
    isDM ||
    profile?.role === 'dm' ||
    user?.role === 'dm' ||
    profile?.displayName?.includes('(DM)')
  );

  // ────────────────── TAC-COMMS LIVE SYNC ──────────────────
  useEffect(() => {
    let unsubscribe = null;
    try {
      if (db) {
        const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(500));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const live = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                  id: d.id,
                  ...data,
                  createdMillis:
                    data.createdAt?.toMillis
                      ? data.createdAt.toMillis()
                      : data.createdAt?.seconds
                        ? data.createdAt.seconds * 1000
                        : Number(data.createdMillis || data.createdAt) || Date.now(),
                };
              });

              setBroadcasts((prev) => {
                const map = new Map();
                prev.forEach((b) => {
                  if (b && b.id) map.set(b.id, b);
                });
                live.forEach((b) => {
                  if (b && b.id) map.set(b.id, b);
                });
                return Array.from(map.values()).sort((a, b) => {
                  const tA = a.createdMillis || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Number(a.createdAt) || 0);
                  const tB = b.createdMillis || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Number(b.createdAt) || 0);
                  return tB - tA;
                });
              });
            }
          },
          (err) => {
            console.warn('[CommsAndRollsFlow] Firestore comms sync notice:', err.message);
          }
        );
      }
    } catch (_) {}

    const handleCustomBroadcast = (e) => {
      if (e.detail) {
        setBroadcasts((prev) => [e.detail, ...prev.filter((b) => b.id !== e.detail.id)]);
      }
    };
    window.addEventListener('unendingvoid:new_broadcast', handleCustomBroadcast);

    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (e) => {
          if (e.data?.broadcast) {
            setBroadcasts((prev) => [e.data.broadcast, ...prev.filter((b) => b.id !== e.data.broadcast.id)]);
          }
        };
      }
    } catch (_) {}

    const handleStorage = (e) => {
      if (e.key === LATEST_BROADCAST_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.broadcast) {
            setBroadcasts((prev) => [parsed.broadcast, ...prev.filter((b) => b.id !== parsed.broadcast.id)]);
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('unendingvoid:new_broadcast', handleCustomBroadcast);
      window.removeEventListener('storage', handleStorage);
      if (bc) {
        try {
          bc.close();
        } catch (_) {}
      }
    };
  }, []);

  // ────────────────── QUANTUM ROLLS LIVE SYNC ──────────────────
  useEffect(() => {
    const handleRemoteRoll = (data) => {
      if (!data) return;
      setRolls((prev) => {
        const exists = prev.some((r) => r.id === data.id || (r.clientTimestamp && r.clientTimestamp === data.clientTimestamp));
        if (exists) return prev;
        return [data, ...prev].slice(0, 500);
      });
    };

    const handleCustomEvent = (e) => {
      handleRemoteRoll(e.detail);
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'unendingvoid:latest_roll' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleRemoteRoll(parsed);
        } catch (_) {}
      }
    };

    window.addEventListener('unendingvoid:multiplayer_roll', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('unendingvoid:multiplayer_roll', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Hook into useDiceSync for historical and live Firestore rolls
  useDiceSync(
    (newRoll) => {
      setRolls((prev) => {
        const exists = prev.some((r) => r.id === newRoll.id);
        if (exists) return prev;
        return [newRoll, ...prev].slice(0, 500);
      });
    },
    (historicalRolls) => {
      if (Array.isArray(historicalRolls) && historicalRolls.length > 0) {
        setRolls((prev) => {
          const map = new Map();
          historicalRolls.forEach((r) => {
            const key = r.id || `${r.playerId}_${r.clientTimestamp || r.timestamp}`;
            map.set(key, r);
          });
          prev.forEach((r) => {
            const key = r.id || `${r.playerId}_${r.clientTimestamp || r.timestamp}`;
            if (!map.has(key)) map.set(key, r);
          });
          return Array.from(map.values()).slice(0, 500);
        });
      }
    }
  );

  // ────────────────── TAC-COMMS ACTIONS ──────────────────
  const handleSaveToNotesAction = (item) => {
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
      setSavedNoteIds((prev) => new Set([...prev, item.id]));
    }
  };

  const handleSendDmBroadcast = async (e) => {
    e.preventDefault();
    if (!dmTitle.trim() || !dmContent.trim()) return;

    setDmIsSending(true);
    const nowMillis = Date.now();
    const newBroadcast = {
      id: `intel_${nowMillis}`,
      sender: dmChannel,
      channel: dmChannel,
      priority: dmPriority,
      title: dmTitle.trim(),
      content: dmContent.trim(),
      imageUrl: dmImageUrl.trim() || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC',
      createdAt: nowMillis,
      createdMillis: nowMillis,
    };

    try {
      if (db) {
        try {
          await addDoc(collection(db, 'broadcasts'), {
            ...newBroadcast,
            createdAt: serverTimestamp(),
            createdMillis: nowMillis,
          });
        } catch (err) {
          console.warn('[CommsAndRollsFlow] Firestore comms save notice:', err.message);
        }
      }
      saveLocalBroadcast(newBroadcast);
      setDmTitle('');
      setDmContent('');
      setDmImageUrl('');
      setShowDmBroadcaster(false);
    } catch (_) {
    } finally {
      setDmIsSending(false);
    }
  };

  // ────────────────── QUICK ROLL DISPATCHER ──────────────────
  const handleQuickRoll = (notation) => {
    window.dispatchEvent(
      new CustomEvent('unendingvoid:roll', {
        detail: {
          notation,
          modifier: 0,
          label: notation === 'coin' ? "Lucifer's Silver Coin" : `Quick ${notation.toUpperCase()}`,
          rollMode: 'normal',
          isSecret: isViewerDM,
        },
      })
    );
  };

  // ────────────────── FILTERED COMMS ──────────────────
  const filteredBroadcasts = useMemo(() => {
    if (selectedChannel === 'ALL') return broadcasts;
    return broadcasts.filter(
      (b) => (b.channel || b.sender || '').toUpperCase() === selectedChannel.toUpperCase()
    );
  }, [broadcasts, selectedChannel]);

  // ────────────────── FILTERED ROLLS ──────────────────
  const visibleRolls = useMemo(() => {
    return rolls.filter((r) => {
      const isSecret = Boolean(r.isSecret || r.role === 'dm' || r.isDMRoll || r.playerName?.includes('(DM)'));
      if (isSecret && !isViewerDM) return false;
      if (rollFilter === 'MINE') {
        return r.playerId === currentUserId || r.userId === currentUserId;
      }
      return true;
    });
  }, [rolls, rollFilter, isViewerDM, currentUserId]);

  // ────────────────── ROLL ANALYTICS ──────────────────
  const rollStats = useMemo(() => {
    if (visibleRolls.length === 0) {
      return { total: 0, avg: 0, peak: 0, crits: 0 };
    }
    let sum = 0;
    let peak = 0;
    let crits = 0;
    let counted = 0;

    visibleRolls.forEach((r) => {
      const isD10 = Boolean(r.notation?.match(/\d*d10(?!\d)/i));
      const hasZeroFace = r.results?.includes(0) || r.results?.includes('0');
      const val = isD10 && hasZeroFace && (r.total === 0 || r.total === '0')
        ? 10 + (Number(r.modifier) || 0)
        : Number(r.total);

      if (!isNaN(val)) {
        sum += val;
        peak = Math.max(peak, val);
        counted++;
      }
      if (r.chosenResult === 20 || r.results?.includes(20) || val === 100) {
        crits++;
      }
    });

    return {
      total: visibleRolls.length,
      avg: counted > 0 ? (sum / counted).toFixed(1) : 0,
      peak,
      crits,
    };
  }, [visibleRolls]);

  const channelsList = ['ALL', 'FLEET COMMAND', 'SYNDICATE', 'SECURITY', 'DISTRESS', 'GENERAL'];

  return (
    <div className="space-y-6 animate-fade-in font-mono text-xs">
      {/* ──────────────── TOP CONTROL & TELEMETRY HEADER ──────────────── */}
      <div className="glass-panel p-4 md:p-5 border-2 border-emerald-500/40 bg-gradient-to-r from-[#070d1a] via-[#081524] to-[#070d1a] rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <h2 className="font-display text-sm md:text-base font-black text-white uppercase tracking-wider">
              {t('flow.headerTitle', 'Tactical Flow // Comms & Quantum Rolls')}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {t('flow.dualViewActive', 'Live Dual Telemetry Stream Active')}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            {t('flow.headerSubtitle', 'Real-time dual stream telemetry of fleet transmissions and quantum dice outcomes')}
          </p>
        </div>

        {/* Quick Roll Actions Bar */}
        <div className="flex items-center gap-1.5 bg-[#050914] px-3 py-2 rounded-xl border border-slate-700 shadow-inner flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mr-1">
            🎲 {t('flow.quickRoll', 'Quick Roll')}:
          </span>
          {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((d) => (
            <button
              key={d}
              onClick={() => handleQuickRoll(d === 'd100' ? '1d100' : `1${d}`)}
              className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase transition-all
                         ${d === 'd20'
                           ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan/30 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                           : d === 'd100'
                             ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                             : 'text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'}`}
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => handleQuickRoll('coin')}
            className="px-2 py-1 rounded text-xs font-mono font-bold uppercase transition-all bg-slate-300/20 text-slate-200 border border-slate-300/40 hover:bg-slate-300/30 flex items-center gap-1"
          >
            <span>🪙</span>
            <span>Coin</span>
          </button>
        </div>
      </div>

      {/* ──────────────── DUAL STREAM COLUMNS ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COLUMN 1: TAC-COMMS STREAM                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="glass-panel p-4 md:p-5 border-2 border-slate-700/80 bg-[#070b14]/95 rounded-2xl shadow-xl flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📡</span>
              <h3 className="font-display font-black text-xs md:text-sm text-amber-400 uppercase tracking-wider">
                {t('flow.commsColumnTitle', 'TAC-COMMS Stream')}
              </h3>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-gray-200 border border-slate-700 font-bold">
                {filteredBroadcasts.length}
              </span>
            </div>

            {isViewerDM && (
              <button
                onClick={() => setShowDmBroadcaster(!showDmBroadcaster)}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>📢</span>
                <span>{showDmBroadcaster ? 'Close Broadcaster' : t('flow.broadcastNow', 'Broadcast Comms')}</span>
              </button>
            )}
          </div>

          {/* DM Quick Broadcaster Drawer (if active) */}
          {isViewerDM && showDmBroadcaster && (
            <form
              onSubmit={handleSendDmBroadcast}
              className="p-3.5 rounded-xl bg-[#0d1424] border border-amber-500/40 space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold uppercase">
                <span>⚡ Transmit Fleet Directive</span>
                <span className="text-gray-400 font-normal">Encrypted Multi-Channel</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase block mb-1">Channel</label>
                  <select
                    value={dmChannel}
                    onChange={(e) => setDmChannel(e.target.value)}
                    className="w-full bg-[#070a12] border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="FLEET COMMAND">Fleet Command</option>
                    <option value="OUTLAW SYNDICATE">Outlaw Syndicate</option>
                    <option value="STATION SECURITY">Station Security</option>
                    <option value="DISTRESS FREQUENCY">Distress Frequency</option>
                    <option value="GENERAL BROADCAST">General Broadcast</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase block mb-1">Priority</label>
                  <select
                    value={dmPriority}
                    onChange={(e) => setDmPriority(e.target.value)}
                    className="w-full bg-[#070a12] border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency (Red Alert)</option>
                  </select>
                </div>
              </div>
              <input
                type="text"
                placeholder="Transmission Title..."
                value={dmTitle}
                onChange={(e) => setDmTitle(e.target.value)}
                required
                className="w-full bg-[#070a12] border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none"
              />
              <textarea
                placeholder="Broadcast payload / operational telemetry..."
                value={dmContent}
                onChange={(e) => setDmContent(e.target.value)}
                required
                rows={3}
                className="w-full bg-[#070a12] border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none resize-none"
              />
              <input
                type="url"
                placeholder="Image URL (optional)..."
                value={dmImageUrl}
                onChange={(e) => setDmImageUrl(e.target.value)}
                className="w-full bg-[#070a12] border border-slate-700 rounded px-2.5 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={dmIsSending}
                className="w-full py-2 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-500/60 font-bold uppercase text-xs transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              >
                {dmIsSending ? 'Transmitting...' : '📡 Send High-Priority Broadcast'}
              </button>
            </form>
          )}

          {/* Channel Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {channelsList.map((ch) => (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap transition-all
                           ${selectedChannel === ch
                             ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                             : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'}`}
              >
                {ch === 'ALL' ? t('flow.allChannels', 'All Channels') : ch}
              </button>
            ))}
          </div>

          {/* Comms Feed Stream List */}
          <div className="overflow-y-auto max-h-[calc(100vh-22rem)] min-h-[480px] space-y-3 pr-1">
            {filteredBroadcasts.length === 0 ? (
              <div className="py-16 text-center text-gray-500 italic space-y-2">
                <span className="text-3xl block opacity-40">📡</span>
                <p>{t('flow.noBroadcasts', 'No tactical comms recorded yet.')}</p>
              </div>
            ) : (
              filteredBroadcasts.map((item) => {
                const isEmergency = item.priority === 'EMERGENCY' || item.priority === 'URGENT';
                const isSaved = savedNoteIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all shadow-md space-y-2
                               ${isEmergency
                                 ? 'bg-[#150a0a] border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                                 : 'bg-[#0d1424] border-slate-700/80 hover:border-slate-500'}`}
                  >
                    {/* Top Meta Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase
                                     ${isEmergency
                                       ? 'bg-rose-500/25 text-rose-300 border border-rose-500/60 animate-pulse'
                                       : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}
                        >
                          {item.priority || 'ROUTINE'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          {item.channel || item.sender || 'FLEET'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">{item.timestamp}</span>
                    </div>

                    {/* Title & Body */}
                    <h4 className="font-bold text-white text-xs">{item.title}</h4>
                    <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>

                    {/* Image Preview or Tactical External Attachment Card */}
                    {item.imageUrl && (
                      <div className="mt-2">
                        <IntelMediaPreview
                          url={item.imageUrl}
                          title={item.title}
                          onOpenLightbox={(img) => setSelectedImage(img)}
                        />
                      </div>
                    )}

                    {/* Footer Actions */}
                    {onSaveToNotes && (
                      <div className="pt-2 border-t border-white/5 flex justify-end">
                        <button
                          onClick={() => handleSaveToNotesAction(item)}
                          disabled={isSaved}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1.5
                                     ${isSaved
                                       ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                                       : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'}`}
                        >
                          <span>{isSaved ? '✓' : '💾'}</span>
                          <span>{isSaved ? t('flow.saved', 'Saved') : t('flow.saveToNotes', 'Save to Field Notes')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COLUMN 2: QUANTUM ROLL LEDGER STREAM                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="glass-panel p-4 md:p-5 border-2 border-slate-700/80 bg-[#070b14]/95 rounded-2xl shadow-xl flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h3 className="font-display font-black text-xs md:text-sm text-neon-cyan uppercase tracking-wider">
                {t('flow.rollsColumnTitle', 'Quantum Roll Ledger Stream')}
              </h3>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-gray-200 border border-slate-700 font-bold">
                {visibleRolls.length}
              </span>
            </div>

            {/* Roll Scope Toggle */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setRollFilter('ALL')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all
                           ${rollFilter === 'ALL'
                             ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-sm'
                             : 'text-gray-400 hover:text-white'}`}
              >
                {t('flow.filterAll', 'All Rolls')}
              </button>
              <button
                onClick={() => setRollFilter('MINE')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all
                           ${rollFilter === 'MINE'
                             ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-sm'
                             : 'text-gray-400 hover:text-white'}`}
              >
                {t('flow.filterMine', 'My Rolls')}
              </button>
            </div>
          </div>

          {/* Session Roll Analytics KPI Bar */}
          <div className="grid grid-cols-4 gap-2 bg-[#0d1424] p-2.5 rounded-xl border border-slate-800 text-center">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block">
                {t('flow.totalRolls', 'Total Rolls')}
              </span>
              <span className="font-display font-bold text-sm text-white">{rollStats.total}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block">
                {t('flow.averageRoll', 'Average')}
              </span>
              <span className="font-display font-bold text-sm text-neon-cyan">{rollStats.avg}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block">
                {t('flow.highestRoll', 'Peak')}
              </span>
              <span className="font-display font-bold text-sm text-amber-400">{rollStats.peak}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block">
                {t('flow.criticalCount', 'Crits')}
              </span>
              <span className="font-display font-bold text-sm text-neon-green">{rollStats.crits}</span>
            </div>
          </div>

          {/* Roll Feed Stream List */}
          <div className="overflow-y-auto max-h-[calc(100vh-22rem)] min-h-[480px] space-y-2.5 pr-1">
            {visibleRolls.length === 0 ? (
              <div className="py-16 text-center text-gray-500 italic space-y-2">
                <span className="text-3xl block opacity-40">📊</span>
                <p>{t('flow.noRolls', 'No dice rolls logged in current session.')}</p>
              </div>
            ) : (
              visibleRolls.map((r, i) => {
                const isSecret = Boolean(r.isSecret || r.role === 'dm' || r.isDMRoll || r.playerName?.includes('(DM)'));
                const isCrit20 = r.chosenResult === 20 || r.results?.includes(20) || r.total === 100;
                const isCrit1 = r.chosenResult === 1 || r.results?.includes(1);

                return (
                  <div
                    key={r.id || `${r.timestamp}_${i}`}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between shadow-sm
                               ${isSecret
                                 ? 'bg-[#181126] border-purple-500/50 hover:bg-[#201633]'
                                 : isCrit20
                                   ? 'bg-[#061e16] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                   : 'bg-[#0d1424] border-slate-700/80 hover:border-slate-500'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold block text-xs ${
                            isSecret ? 'text-purple-300' : 'text-neon-cyan'
                          }`}
                        >
                          {r.playerName || 'Void Operative'}
                        </span>
                        {isSecret && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] uppercase font-bold">
                            🛡️ {t('flow.dmScreenBadge', 'DM Secret')}
                          </span>
                        )}
                        {isCrit20 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 text-[9px] uppercase font-black animate-pulse">
                            ⚡ CRITICAL HIT
                          </span>
                        )}
                        {isCrit1 && !isCrit20 && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/60 text-[9px] uppercase font-black">
                            💀 CRITICAL FAIL
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-300">
                        <span className="font-bold text-gray-200">{r.purpose || r.notation}</span>
                        <span className="text-gray-400 mx-1.5">·</span>
                        <span className="text-amber-400 font-bold">
                          {r.isCoin
                            ? `[${r.results?.join(', ')}]`
                            : r.tensResult !== undefined
                              ? `[${r.tensResult}, ${r.onesResult}]`
                              : `[${(r.notation?.match(/\d*d10(?!\d)/i)
                                  ? r.results?.map((v) => (v === 0 || v === '0' ? 10 : v))
                                  : r.results
                                )?.join(', ')}]`}
                        </span>
                        {r.modifier !== undefined && r.modifier !== 0 && (
                          <span className="text-slate-400 ml-1">
                            {r.modifier > 0 ? `+${r.modifier}` : r.modifier}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Large Total Result Badge */}
                    <div className="text-right pl-3">
                      <span
                        className={`font-display font-black text-lg md:text-xl block leading-none
                                   ${isCrit20
                                     ? 'text-neon-green drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                                     : isCrit1
                                       ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                                       : 'text-white'}`}
                      >
                        {r.notation?.match(/\d*d10(?!\d)/i) &&
                        (r.results?.includes(0) || r.results?.includes('0')) &&
                        (r.total === 0 || r.total === '0')
                          ? 10 + (Number(r.modifier) || 0)
                          : r.total}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-400">Total</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── TACTICAL IMAGE MODAL ──────────────── */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in font-mono"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="max-w-3xl w-full bg-[#070b14] border-2 border-slate-700 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.95)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 bg-[#0d1424] border-b border-slate-700">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                📡 Tactical Image Intel
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-white hover:bg-white/10 px-2 py-0.5 rounded text-xs transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Tactical Telemetry"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

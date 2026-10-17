import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { saveLocalBroadcast } from '../shared/DMIntelBroadcast';

const QUICK_IMAGE_PRESETS = [
  {
    label: 'Orbital Fleet',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Pirate Corvette',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Bounty Mugshot',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Alien Monolith',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  },
];

export default function IntelBroadcaster() {
  const { t } = useTranslation();
  const [channel, setChannel] = useState('MCRN NAVAL COMMAND');
  const [priority, setPriority] = useState('FLASH');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsBroadcasting(true);
    setStatusMessage(null);

    const nowMillis = Date.now();
    const newBroadcast = {
      id: `intel_${nowMillis}`,
      sender: channel,
      channel: channel,
      priority,
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim() || null,
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
          console.warn('[IntelBroadcaster] Firestore write error, saving locally:', err.message);
        }
      }
      saveLocalBroadcast(newBroadcast);

      setStatusMessage({ type: 'success', text: t('intel.broadcastSuccess') || 'Transmission dispatched to all operative terminals!' });
      setTitle('');
      setContent('');
      setImageUrl('');
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to broadcast: ${err.message}` });
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="glass-panel p-5 space-y-4 border-l-4 border-l-amber-500 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-base">📡</span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
            {t('intel.broadcasterTitle') || 'DM Tactical Intel & Comms Broadcaster'}
          </h3>
        </div>
        <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-black/40 border border-amber-500/30">
          The Expanse // Comms Array
        </span>
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        {t('intel.broadcasterDesc') || 'Broadcast mission sitreps, intercepted military transmissions, underworld bounties, and surveillance imagery directly to player HUDs.'}
      </p>

      {statusMessage && (
        <div
          className={`p-2.5 rounded border text-xs ${
            statusMessage.type === 'success'
              ? 'bg-neon-green/10 border-neon-green/40 text-neon-green'
              : 'bg-red-500/10 border-red-500/40 text-red-400'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleBroadcast} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Channel / Faction */}
          <div>
            <label className="text-[10px] uppercase text-gray-400 block mb-1">
              {t('intel.channelLabel') || 'Transmission Channel / Origin'}
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
            >
              <option value="MCRN NAVAL COMMAND">🔴 MCRN Naval Command (Mars)</option>
              <option value="UNN SECURITY BUREAU">🔵 UNN Security Bureau (Earth)</option>
              <option value="BELTER UNDERGROUND">🟡 Belter Outlaw Alliance (Ceres)</option>
              <option value="SYNDICATE BOUNTY BOARD">🟣 Underworld Syndicate</option>
              <option value="VOID RECON SATELLITE">🟢 Deep Void Recon Satellite</option>
              <option value="TACTICAL DM SITREP">⚡ Tactical Director (GM)</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[10px] uppercase text-gray-400 block mb-1">
              {t('intel.priorityLabel') || 'Flash Priority'}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white font-mono focus:border-amber-500 focus:outline-none"
            >
              <option value="FLASH">🔴 FLASH (Immediate Tactical Alert)</option>
              <option value="URGENT">🟡 URGENT (High Priority)</option>
              <option value="STANDARD">🔵 STANDARD (General Sitrep)</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] uppercase text-gray-400 block mb-1">
            {t('intel.titleLabel') || 'Sitrep Headline / Subject'}
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Hostile Epstein Plume in Sector 7 // Ceres Quarantine"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-[10px] uppercase text-gray-400 block mb-1">
            {t('intel.contentLabel') || 'Intel Briefing Content / Sitrep Report'}
          </label>
          <textarea
            required
            rows={3}
            placeholder="Provide tactical situation report, coordinates, bounty bounties, or lore dossier..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-[#070b14] border border-slate-700 rounded p-2 text-white font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Optional Image URL + Presets */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase text-gray-400 block">
            {t('intel.imageLabel') || 'Surveillance Still / Imagery URL (Optional)'}
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://... (or click quick preset below)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 bg-[#070b14] border border-slate-700 rounded p-2 text-white font-mono placeholder-gray-600 text-xs focus:border-amber-500 focus:outline-none"
            />
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[9px] uppercase text-gray-500">Quick Presets:</span>
            {QUICK_IMAGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setImageUrl(preset.url)}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 text-[10px] transition-colors"
              >
                📷 {preset.label}
              </button>
            ))}
          </div>

          {/* Tactical Tip for Direct Images vs Pinterest / Web Links */}
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300/90 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400">
              <span>💡</span>
              <span>{t('intel.imageTipTitle') || 'Direct Image vs. Web Link Tip:'}</span>
            </div>
            <p>
              {t('intel.imageTip') || 'For direct inline image rendering, right-click any image on Pinterest or the Web and choose "Copy Image Address" (.jpg/.png/i.pinimg.com). Webpage links (e.g. pin.it) display cleanly as clickable tactical dossiers.'}
            </p>
          </div>
        </div>

        {/* Broadcast Trigger */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isBroadcasting}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>📡</span>
            <span>{isBroadcasting ? (t('intel.dispatching') || 'Transmitting Over Subspace...') : (t('intel.broadcastButton') || 'Broadcast Intel to Fleet')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';
import { resolvePartyRest } from '../../lib/campaignActions';

export default function DMRestRequestBanner({
  restRequest,
  campaignId,
  players = [],
  currentCampaignTime,
  onResolve,
}) {
  const { t } = useTranslation();

  if (!restRequest || restRequest.status !== 'pending') {
    return null;
  }

  const restTypeLabel = restRequest.type === 'long'
    ? t('rest.long', 'Long')
    : t('rest.short', 'Short');

  const totalPartyCount = Math.max(1, players.length || Object.keys(restRequest.votes || {}).length || 1);
  const agreedCount = Object.values(restRequest.votes || {}).filter((v) => v === 'agreed').length;
  const declinedCount = Object.values(restRequest.votes || {}).filter((v) => v === 'declined').length;
  const unvotedCount = Math.max(0, totalPartyCount - (agreedCount + declinedCount));

  // Build the secondary vote detail breakdown
  let detailSnippet = '';
  if (declinedCount > 0 && unvotedCount > 0) {
    detailSnippet = `(${t('rest.declined', { count: declinedCount, defaultValue: `${declinedCount} declined` })}, ${t('rest.didntVote', { count: unvotedCount, defaultValue: `${unvotedCount} didn't vote` })})`;
  } else if (declinedCount > 0) {
    detailSnippet = `(${t('rest.declined', { count: declinedCount, defaultValue: `${declinedCount} declined` })})`;
  } else if (unvotedCount > 0) {
    detailSnippet = `(${t('rest.didntVote', { count: unvotedCount, defaultValue: `${unvotedCount} didn't vote` })})`;
  }

  const handleAllow = async () => {
    if (!campaignId) return;
    try {
      if (onResolve) {
        await onResolve(true);
      } else {
        await resolvePartyRest(campaignId, true, players, currentCampaignTime);
      }
    } catch (err) {
      console.warn('[DMRestRequestBanner] Error allowing rest:', err);
    }
  };

  const handleDeny = async () => {
    if (!campaignId) return;
    try {
      if (onResolve) {
        await onResolve(false);
      } else {
        await resolvePartyRest(campaignId, false, players, currentCampaignTime);
      }
    } catch (err) {
      console.warn('[DMRestRequestBanner] Error denying rest:', err);
    }
  };

  return (
    <div
      role="region"
      aria-label="Rest Requisition Banner"
      className="glass-panel p-4 md:p-5 border-2 border-amber-400 bg-gradient-to-r from-[#0d1424] via-[#141b2e] to-[#0d1424] shadow-[0_0_30px_rgba(245,158,11,0.3)] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono animate-fade-in"
    >
      {/* Left: Requisition Details & Vote Tally */}
      <div className="space-y-1.5 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2">
          <span className="text-xl">{restRequest.type === 'long' ? '🛌' : '☕'}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
            {t('rest.dmTitle', 'Squad Rest Authorization')}
          </span>
          <span className="text-xs text-gray-400">
            {restRequest.type === 'long' ? '(+8h)' : '(+2h)'}
          </span>
        </div>

        <h3 className="font-display text-base md:text-lg font-black text-white tracking-wide">
          <span className="text-neon-cyan">{restRequest.requesterName || 'Void Operative'}</span>{' '}
          {t('rest.askingRest', {
            name: '',
            type: restTypeLabel,
            defaultValue: `is asking for a ${restTypeLabel} Rest.`,
          })}
        </h3>

        {/* 1/2 players asking for long rest (1 didn't vote / 1 declined) */}
        <p className="text-xs text-amber-300 font-bold">
          <span>
            {t('rest.dmAsking', {
              count: agreedCount,
              total: totalPartyCount,
              type: restTypeLabel,
              defaultValue: `${agreedCount}/${totalPartyCount} players asking for ${restTypeLabel} Rest`,
            })}
          </span>{' '}
          <span className="text-gray-400 font-normal">{detailSnippet}</span>
        </p>
      </div>

      {/* Right: DM Decision Controls (Allow / Deny) */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-gray-200 hidden lg:inline">
          {t('rest.allowPrompt', {
            type: restTypeLabel,
            defaultValue: `Allow ${restTypeLabel} Rest?`,
          })}
        </span>

        <button
          type="button"
          onClick={handleDeny}
          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/60 hover:border-red-400 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
        >
          ✕ {t('rest.deny', 'Deny')}
        </button>

        <button
          type="button"
          onClick={handleAllow}
          className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-display shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer font-black"
        >
          ✓ {t('rest.allow', 'Allow')}
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';
import { votePartyRest, cancelPartyRest } from '../../lib/campaignActions';

export default function RestRequestModal({
  restRequest,
  campaignId,
  currentUser,
  activeCharacters = [],
  onClose,
}) {
  const { t } = useTranslation();

  if (!restRequest || !restRequest.status || restRequest.status === 'cancelled') {
    return null;
  }

  const myId = currentUser?.id || currentUser?.uid;
  const isRequester = restRequest.requesterId === myId;
  const myVote = restRequest.votes?.[myId];

  const restTypeLabel = restRequest.type === 'long'
    ? t('rest.long', 'Long')
    : t('rest.short', 'Short');

  // Calculate vote stats
  const totalPartyCount = Math.max(1, activeCharacters.length || Object.keys(restRequest.votes || {}).length || 1);
  const agreedCount = Object.values(restRequest.votes || {}).filter((v) => v === 'agreed').length;
  const declinedCount = Object.values(restRequest.votes || {}).filter((v) => v === 'declined').length;

  const handleVote = async (decision) => {
    if (!campaignId || !myId) return;
    try {
      await votePartyRest(campaignId, myId, decision);
    } catch (err) {
      console.warn('[RestRequestModal] Vote error:', err);
    }
  };

  const handleCancel = async () => {
    if (!campaignId) return;
    try {
      await cancelPartyRest(campaignId);
      if (onClose) onClose();
    } catch (err) {
      console.warn('[RestRequestModal] Cancel error:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-mono"
    >
      <div className="relative max-w-md w-full bg-[#080d1a] border-2 border-cyan-500/70 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,240,255,0.35)] space-y-5 text-center overflow-hidden">
        {/* Top glow stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 animate-pulse" />

        {/* Top-right close button for resolved dialogs */}
        {(restRequest.status === 'approved' || restRequest.status === 'denied') && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title={t('common.close', 'Close')}
          >
            ✕
          </button>
        )}

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-neon-cyan text-xs font-bold uppercase tracking-wider">
            <span>{restRequest.type === 'long' ? '🛌' : '☕'}</span>
            <span>{t('rest.requestTitle', 'Squad Rest Requisition')}</span>
          </div>
          <h2 className="font-display text-xl font-black text-white tracking-wide pt-2">
            {t('rest.askingRest', {
              name: restRequest.requesterName || 'Void Operative',
              type: restTypeLabel,
              defaultValue: `${restRequest.requesterName || 'Void Operative'} is asking for a ${restTypeLabel} Rest.`,
            })}
          </h2>
          <p className="text-[11px] text-gray-400 font-mono">
            {t('rest.hoursInfo', 'Short Rest: 2 Hours · Long Rest: 8 Hours')}
          </p>
        </div>

        {/* Status: Approved */}
        {restRequest.status === 'approved' && (
          <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-4 text-emerald-300 space-y-2">
            <span className="text-2xl block">✅</span>
            <p className="text-xs font-bold">
              {t('rest.approvedNotice', {
                type: restTypeLabel,
                defaultValue: `DM authorized the ${restTypeLabel} Rest! Time advanced and vitals restored.`,
              })}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        )}

        {/* Status: Denied */}
        {restRequest.status === 'denied' && (
          <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-4 text-red-300 space-y-2">
            <span className="text-2xl block">❌</span>
            <p className="text-xs font-bold">
              {t('rest.deniedNotice', 'DM denied the rest request.')}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold uppercase"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        )}

        {/* Status: Pending */}
        {restRequest.status === 'pending' && (
          <>
            {/* Live Tally Bar */}
            <div className="bg-[#050814] border border-white/10 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-300">
                <span>{t('rest.dmAsking', { count: agreedCount, total: totalPartyCount, type: restTypeLabel, defaultValue: `${agreedCount}/${totalPartyCount} operatives agreed` })}</span>
                <span className="text-neon-cyan">{Math.round((agreedCount / totalPartyCount) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((agreedCount / totalPartyCount) * 100))}%` }}
                />
              </div>
              {declinedCount > 0 && (
                <p className="text-[10px] text-rose-400 font-bold">
                  {t('rest.declined', { count: declinedCount, defaultValue: `${declinedCount} declined` })}
                </p>
              )}
            </div>

            {/* Voting Prompt for Non-requester who hasn't voted yet */}
            {!isRequester && !myVote && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-gray-200">
                  {t('rest.doYouAgree', {
                    type: restTypeLabel,
                    defaultValue: `Do you agree to take a ${restTypeLabel} Rest with the squad?`,
                  })}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleVote('declined')}
                    className="w-1/2 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    ✕ {t('rest.decline', 'Decline')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote('agreed')}
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    ✓ {t('rest.agree', 'Agree')}
                  </button>
                </div>
              </div>
            )}

            {/* Message if already voted */}
            {(!isRequester && myVote) && (
              <div className="py-2 space-y-1">
                <p className="text-xs font-bold text-neon-cyan">
                  {myVote === 'agreed'
                    ? `✓ ${t('rest.youAgreed', 'You agreed to take a rest.')}`
                    : `✕ ${t('rest.youDeclined', 'You declined the rest request.')}`}
                </p>
                <p className="text-[11px] text-gray-400 animate-pulse">
                  {t('rest.waitingForDM', 'Waiting for squad votes and DM authorization...')}
                </p>
              </div>
            )}

            {/* Requester view */}
            {isRequester && (
              <div className="space-y-3 pt-1">
                <p className="text-[11px] text-gray-400 animate-pulse">
                  {t('rest.waitingForDM', 'Waiting for squad votes and DM authorization...')}
                </p>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-gray-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/50 hover:bg-rose-950/20 transition-all"
                >
                  {t('rest.cancelRequest', 'Cancel Request')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

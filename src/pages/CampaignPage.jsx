import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { usePlayerData } from '../hooks/usePlayerData';
import { useCollection } from '../hooks/useCollection';
import { addCharacterToCampaign, deleteCampaign, removeCharacterFromCampaign } from '../lib/campaignActions';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function CampaignPage() {
  const { t } = useTranslation();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { docs: campaigns, loading: campaignsLoading } = useCollection('campaigns');
  const { docs: characters, loading: charactersLoading } = useCollection('players');

  const [selectedCharId, setSelectedCharId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (campaignsLoading || charactersLoading) return <LoadingSpinner />;

  const campaign = campaigns.find((c) => c.id === campaignId);

  if (!campaign) {
    return (
      <div className="min-h-dvh bg-void-bg text-white p-8 flex items-center justify-center">
        <div className="glass-panel p-8 text-center space-y-4 max-w-md border-l-4 border-l-neon-red">
          <span className="text-4xl block">⚠️</span>
          <h2 className="font-display text-xl font-bold">Campaign Beacon Not Found</h2>
          <p className="text-xs text-gray-400">
            The campaign you requested does not exist or your quantum signal was scrambled.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan rounded text-xs font-mono font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Find characters owned by this user
  const myCharacters = characters.filter(
    (c) => c.ownerId === user?.uid || c.uid === user?.uid
  );

  // Characters assigned to this campaign
  const assignedCharIds = (campaign.activeCharacters || []).map((ac) => ac.characterId || ac.uid);
  const partyCharacters = characters.filter((c) => assignedCharIds.includes(c.id || c.uid));

  // Available characters to add
  const unassignedMyChars = myCharacters.filter((c) => !assignedCharIds.includes(c.id || c.uid));

  const handleAddCharacter = async (e) => {
    e.preventDefault();
    if (!selectedCharId) return;

    const charToAdd = myCharacters.find((c) => (c.id || c.uid) === selectedCharId);
    if (!charToAdd) return;

    setSubmitting(true);
    try {
      await addCharacterToCampaign(campaignId, charToAdd);
      setSelectedCharId('');
    } catch (err) {
      console.error('[CampaignPage] Failed to add character:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCampaign = async () => {
    const confirmDelete = window.confirm(
      t('campaign.confirmDeleteCampaign', `Are you sure you want to permanently delete campaign "${campaign.name}"? This action cannot be undone.`)
    );
    if (!confirmDelete) return;

    try {
      await deleteCampaign(campaign.id);
      alert(t('campaign.campaignDeleted', 'Campaign successfully deleted.'));
      navigate('/dashboard');
    } catch (err) {
      console.error('[CampaignPage] Delete campaign error:', err);
      alert(t('campaign.failedToDelete', 'Failed to delete campaign') + ': ' + err.message);
    }
  };

  const handleRemoveCharacter = async (char) => {
    const charName = char.displayName || char.name || 'Operative';
    const confirmRemove = window.confirm(
      t('campaign.confirmRemoveCharacter', `Remove operative "${charName}" from this campaign roster?`)
    );
    if (!confirmRemove) return;

    try {
      await removeCharacterFromCampaign(campaign.id, char.id || char.uid);
      alert(t('campaign.characterRemoved', `Operative "${charName}" removed from campaign.`));
    } catch (err) {
      console.error('[CampaignPage] Remove character error:', err);
      alert(t('campaign.failedToRemove', 'Failed to remove operative') + ': ' + err.message);
    }
  };

  const isDM = campaign.dmId === user?.uid;

  return (
    <div className="min-h-dvh bg-void-bg text-white p-4 md:p-8 space-y-6">
      {/* Campaign Header */}
      <div className="glass-panel p-6 border-l-4 border-l-neon-magenta flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-black text-white">{campaign.name}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/40">
              Active Mission
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Dungeon Master: <span className="text-neon-cyan font-bold">{campaign.dmName}</span> · Invite Code: <span className="text-white font-bold bg-black/40 px-2 py-0.5 rounded">{campaign.inviteCode}</span>
          </p>
          {campaign.description && (
            <p className="text-xs text-gray-300 mt-3 max-w-2xl leading-relaxed">
              {campaign.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDM && (
            <button
              onClick={handleDeleteCampaign}
              className="px-3.5 py-1.5 rounded bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5"
              title={t('campaign.deleteCampaign', 'Delete Campaign')}
            >
              <span>🗑️</span>
              <span>{t('campaign.deleteCampaign', 'Delete Campaign')}</span>
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="px-3.5 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono uppercase tracking-wider text-gray-300"
          >
            ◀ Hub
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Party Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <span>👥</span> Party Operatives ({partyCharacters.length})
            </h2>
          </div>

          {partyCharacters.length === 0 ? (
            <div className="glass-panel p-8 text-center text-xs text-gray-500 border-dashed border-white/10 rounded-lg">
              No operatives have deployed to this campaign yet. Add your operative below!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {partyCharacters.map((char) => {
                const isMine = char.ownerId === user?.uid || char.uid === user?.uid;

                return (
                  <div
                    key={char.id}
                    className="glass-panel p-4 border border-white/10 hover:border-neon-cyan/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-display font-bold text-sm text-white">
                          {char.displayName || char.name}
                        </h3>
                        {isMine && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40">
                            Yours
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono mb-3">
                        Lv {char.level || 1} {char.characterClass || 'Operative'} · {char.species || 'Human'}
                      </p>

                      <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center mb-3">
                        <div className="bg-white/5 p-1 rounded">
                          <span className="text-[9px] text-gray-500 block">HP</span>
                          <span className="text-neon-green font-bold">{char.hp}/{char.maxHp}</span>
                        </div>
                        <div className="bg-white/5 p-1 rounded">
                          <span className="text-[9px] text-gray-500 block">Shield</span>
                          <span className="text-neon-cyan font-bold">{char.shields}</span>
                        </div>
                        <div className="bg-white/5 p-1 rounded">
                          <span className="text-[9px] text-gray-500 block">Credits</span>
                          <span className="text-amber-300 font-bold">{char.credits}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      {isMine && (
                        <button
                          onClick={() => navigate(`/character/${char.id}`)}
                          className="w-full py-1.5 rounded bg-neon-cyan/15 hover:bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/40 text-xs font-mono font-bold uppercase tracking-wider"
                        >
                          Open Character Sheet ▶
                        </button>
                      )}
                      {(isMine || isDM) && (
                        <button
                          onClick={() => handleRemoveCharacter(char)}
                          className="w-full py-1 rounded bg-rose-950/25 hover:bg-rose-900/40 text-rose-400 border border-rose-500/30 text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                          title={t('campaign.removeFromCampaign', 'Remove from Campaign')}
                        >
                          <span>✕</span>
                          <span>{t('campaign.removeFromCampaign', 'Remove from Campaign')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Deploy Character Form */}
        <div className="space-y-4">
          <div className="glass-panel p-5 border-l-4 border-l-neon-cyan space-y-4">
            <h3 className="font-display text-sm font-bold text-neon-cyan">
              Deploy Your Operative
            </h3>
            <p className="text-xs text-gray-400">
              Select one of your existing characters to add them to this campaign roster. The DM will be able to manage combat and awards.
            </p>

            {unassignedMyChars.length === 0 ? (
              <div className="text-xs text-gray-500 space-y-2">
                <p>You have no unassigned operatives available.</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-gray-300 uppercase"
                >
                  Create New Character in Hub
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddCharacter} className="space-y-3">
                <select
                  value={selectedCharId}
                  onChange={(e) => setSelectedCharId(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-xs font-mono text-white focus:border-neon-cyan focus:outline-none"
                >
                  <option value="">Choose an operative...</option>
                  {unassignedMyChars.map((char) => (
                    <option key={char.id || char.uid} value={char.id || char.uid}>
                      {char.displayName || char.name} (Lv {char.level || 1} {char.characterClass})
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={submitting || !selectedCharId}
                  className="w-full py-2 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {submitting ? 'Transmitting Roster...' : '⚡ Deploy Character'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

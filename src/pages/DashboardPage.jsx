import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { createCampaign, createCharacter, deleteCampaign } from '../lib/campaignActions';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import { logout } from '../lib/authService';

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('characters'); // 'characters' | 'campaigns'
  const [showCreateCharModal, setShowCreateCharModal] = useState(false);
  const [showCreateCampModal, setShowCreateCampModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const handleDeleteCampaign = async (camp) => {
    const confirmDelete = window.confirm(
      t('campaign.confirmDeleteCampaign', `Are you sure you want to permanently delete campaign "${camp.name}"? This action cannot be undone.`)
    );
    if (!confirmDelete) return;

    try {
      await deleteCampaign(camp.id);
      alert(t('campaign.campaignDeleted', 'Campaign successfully deleted.'));
    } catch (err) {
      console.error('[DashboardPage] Delete campaign error:', err);
      alert(t('campaign.failedToDelete', 'Failed to delete campaign') + ': ' + err.message);
    }
  };

  // Form states for Character creation
  const [charName, setCharName] = useState('');
  const [charClass, setCharClass] = useState('Cyber-Commando');
  const [charSpecies, setCharSpecies] = useState('Augmented Human');
  const [charBackground, setCharBackground] = useState('Ex-Corporate Mercenary');
  const [charStats, setCharStats] = useState({
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 10,
    charisma: 8,
  });

  // Form states for Campaign creation
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Fetch all players and campaigns
  const { docs: allCharacters } = useCollection('players');
  const { docs: allCampaigns } = useCollection('campaigns');

  // Filter characters owned by current user
  const myCharacters = allCharacters.filter(
    (c) => c.ownerId === user?.uid || c.uid === user?.uid
  );

  // Filter campaigns where user is DM or participating
  const myCampaigns = allCampaigns.filter(
    (camp) =>
      camp.dmId === user?.uid ||
      camp.activeCharacters?.some((ac) => ac.ownerId === user?.uid || ac.playerId === user?.uid)
  );

  const handleCreateCharacter = async (e) => {
    e.preventDefault();
    if (!charName.trim()) return;

    setLoadingAction(true);
    try {
      const newChar = await createCharacter({
        ownerId: user?.uid,
        name: charName,
        characterClass: charClass,
        species: charSpecies,
        background: charBackground,
        stats: charStats,
      });

      setShowCreateCharModal(false);
      setCharName('');
      navigate(`/character/${newChar.id}`);
    } catch (err) {
      console.error('[Dashboard] Error creating character:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campName.trim()) return;

    setLoadingAction(true);
    try {
      const newCamp = await createCampaign({
        name: campName,
        description: campDesc,
        dmId: user?.uid,
        dmName: user?.displayName || user?.email?.split('@')[0] || 'Void Master',
      });

      setShowCreateCampModal(false);
      setCampName('');
      setCampDesc('');
      navigate(`/dm/${newCamp.id}`);
    } catch (err) {
      console.error('[Dashboard] Error creating campaign:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinCampaign = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    const found = allCampaigns.find(
      (c) => c.inviteCode?.toUpperCase() === joinCode.trim().toUpperCase()
    );

    if (found) {
      navigate(`/campaign/${found.id}`);
    } else {
      alert('Campaign invite code not found. Please verify the code with your DM.');
    }
  };

  return (
    <div className="min-h-dvh bg-void-bg text-white p-4 md:p-8 space-y-6">
      {/* Top Navigation Bar */}
      <header className="glass-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.2)]">
        <div>
          <h1 className="font-display text-2xl font-black text-neon-cyan tracking-wider drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
            UNENDING VOID
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Operational Hub · User: {user?.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider text-gray-400 border border-white/10 hover:border-neon-red/50 hover:text-neon-red hover:bg-neon-red/10 transition-all duration-200"
          >
            {t('auth.logout') || 'Logout'}
          </button>
        </div>
      </header>

      {/* Primary Section Switcher Tabs */}
      <div className="flex border-b border-white/10 gap-4">
        <button
          onClick={() => setActiveTab('characters')}
          className={`pb-3 text-sm font-display font-bold uppercase tracking-wider transition-all flex items-center gap-2
                     ${activeTab === 'characters'
                       ? 'text-neon-cyan border-b-2 border-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]'
                       : 'text-gray-400 hover:text-white'}`}
        >
          <span>👤</span>
          <span>My Characters ({myCharacters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 text-sm font-display font-bold uppercase tracking-wider transition-all flex items-center gap-2
                     ${activeTab === 'campaigns'
                       ? 'text-neon-magenta border-b-2 border-neon-magenta drop-shadow-[0_0_10px_rgba(255,0,170,0.5)]'
                       : 'text-gray-400 hover:text-white'}`}
        >
          <span>🌌</span>
          <span>My Campaigns ({myCampaigns.length})</span>
        </button>
      </div>

      {/* ──────────────── TAB 1: MY CHARACTERS ──────────────── */}
      {activeTab === 'characters' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white tracking-wide">
              Registered Operatives
            </h2>
            <button
              onClick={() => setShowCreateCharModal(true)}
              className="px-4 py-2 rounded-lg bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 text-xs font-display font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:scale-105"
            >
              + Create New Character
            </button>
          </div>

          {myCharacters.length === 0 ? (
            <div className="glass-panel p-12 text-center border-dashed border-white/20 rounded-xl space-y-3">
              <span className="text-4xl block">🚀</span>
              <h3 className="font-display text-base font-bold text-white">No Characters Found</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                You have not deployed any operatives into the void yet. Build your first hero to join campaigns and roll dice!
              </p>
              <button
                onClick={() => setShowCreateCharModal(true)}
                className="mt-2 px-5 py-2.5 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan text-xs font-mono font-bold uppercase tracking-wider"
              >
                Assemble Character
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCharacters.map((char) => (
                <div
                  key={char.id}
                  className="glass-panel p-5 border-l-4 border-l-neon-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-display text-base font-bold text-white">
                          {char.displayName || char.name}
                        </h3>
                        <p className="text-xs text-neon-cyan font-mono">
                          Level {char.level || 1} · {char.characterClass || 'Operative'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/10 text-gray-300">
                        {char.species || 'Human'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-white/10 font-mono text-xs text-center">
                      <div className="bg-white/5 p-1.5 rounded">
                        <span className="text-[10px] text-gray-400 block uppercase">HP</span>
                        <span className="text-neon-green font-bold">
                          {char.hp || 24}/{char.maxHp || 24}
                        </span>
                      </div>
                      <div className="bg-white/5 p-1.5 rounded">
                        <span className="text-[10px] text-gray-400 block uppercase">Shields</span>
                        <span className="text-neon-cyan font-bold">{char.shields || 15}</span>
                      </div>
                      <div className="bg-white/5 p-1.5 rounded">
                        <span className="text-[10px] text-gray-400 block uppercase">Credits</span>
                        <span className="text-amber-300 font-bold">{char.credits || 250}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/character/${char.id}`)}
                    className="w-full py-2 rounded bg-neon-cyan/15 hover:bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/40 text-xs font-mono font-bold uppercase tracking-wider transition-all"
                  >
                    Launch Character Sheet ▶
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: MY CAMPAIGNS ──────────────── */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold text-white tracking-wide">
              Active Campaigns
            </h2>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Join Campaign via Code */}
              <form onSubmit={handleJoinCampaign} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Invite Code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="bg-void-bg border border-white/20 rounded px-2.5 py-1.5 text-xs text-white font-mono uppercase focus:border-neon-cyan focus:outline-none w-28 sm:w-32"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-mono font-bold text-gray-200"
                >
                  Join
                </button>
              </form>

              <button
                onClick={() => setShowCreateCampModal(true)}
                className="px-4 py-2 rounded-lg bg-neon-magenta/20 hover:bg-neon-magenta/30 text-neon-magenta border border-neon-magenta/50 text-xs font-display font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,0,170,0.3)] hover:scale-105"
              >
                + Create Campaign
              </button>
            </div>
          </div>

          {myCampaigns.length === 0 ? (
            <div className="glass-panel p-12 text-center border-dashed border-white/20 rounded-xl space-y-3">
              <span className="text-4xl block">🌌</span>
              <h3 className="font-display text-base font-bold text-white">No Campaigns Active</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Create a campaign as Dungeon Master to lead missions, or enter an invite code from your DM.
              </p>
              <button
                onClick={() => setShowCreateCampModal(true)}
                className="mt-2 px-5 py-2.5 rounded bg-neon-magenta/20 text-neon-magenta border border-neon-magenta text-xs font-mono font-bold uppercase tracking-wider"
              >
                Create New Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCampaigns.map((camp) => {
                const isDM = camp.dmId === user?.uid;

                return (
                  <div
                    key={camp.id}
                    className={`glass-panel p-5 border-l-4 transition-all flex flex-col justify-between
                               ${isDM
                                 ? 'border-l-neon-magenta hover:shadow-[0_0_20px_rgba(255,0,170,0.2)]'
                                 : 'border-l-neon-cyan hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]'}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-display text-base font-bold text-white">{camp.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border
                                     ${isDM
                                       ? 'bg-neon-magenta/20 text-neon-magenta border-neon-magenta/50'
                                       : 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50'}`}
                        >
                          {isDM ? '👑 Dungeon Master' : '⚔️ Player'}
                        </span>
                      </div>

                      {camp.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                          {camp.description}
                        </p>
                      )}

                      <div className="text-[11px] font-mono text-gray-400 space-y-1 mb-4 pt-2 border-t border-white/5">
                        <div>
                          DM: <span className="text-gray-200 font-bold">{camp.dmName}</span>
                        </div>
                        <div>
                          Invite Code:{' '}
                          <span className="text-neon-cyan font-bold bg-black/40 px-1.5 py-0.5 rounded">
                            {camp.inviteCode}
                          </span>
                        </div>
                        <div>
                          Party Size:{' '}
                          <span className="text-white font-bold">
                            {camp.activeCharacters?.length || 0} Operatives
                          </span>
                        </div>
                      </div>
                    </div>

                    {isDM ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => navigate(`/dm/${camp.id}`)}
                          className="w-full py-2 rounded bg-neon-magenta/20 hover:bg-neon-magenta/30 text-neon-magenta border border-neon-magenta/50 text-xs font-mono font-bold uppercase tracking-wider transition-all"
                        >
                          Start Campaign (DM Console) 👑
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp)}
                          className="w-full py-1.5 rounded bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                          title={t('campaign.deleteCampaign', 'Delete Campaign')}
                        >
                          <span>🗑️</span>
                          <span>{t('campaign.deleteCampaign', 'Delete Campaign')}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/campaign/${camp.id}`)}
                        className="w-full py-2 rounded bg-neon-cyan/15 hover:bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/40 text-xs font-mono font-bold uppercase tracking-wider transition-all"
                      >
                        Enter Campaign & Roster ▶
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── MODAL: CREATE CHARACTER ──────────────── */}
      {showCreateCharModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-lg w-full border-neon-cyan shadow-[0_0_30px_rgba(0,240,255,0.3)] animate-fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display text-base font-bold text-neon-cyan">
                Deploy New Operative
              </h3>
              <button
                onClick={() => setShowCreateCharModal(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCharacter} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 uppercase block mb-1">Operative Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commander Sarah Nova"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:border-neon-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 uppercase block mb-1">Class</label>
                  <select
                    value={charClass}
                    onChange={(e) => setCharClass(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:border-neon-cyan focus:outline-none"
                  >
                    <option value="Cyber-Commando">Cyber-Commando (Fighter)</option>
                    <option value="Void Mystic">Void Mystic (Mage/Psion)</option>
                    <option value="Nano-Tech Operator">Nano-Tech Operator (Artificer)</option>
                    <option value="Star-Pilot">Star-Pilot (Ranger)</option>
                    <option value="Infiltrator">Tech Infiltrator (Rogue)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 uppercase block mb-1">Species</label>
                  <select
                    value={charSpecies}
                    onChange={(e) => setCharSpecies(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:border-neon-cyan focus:outline-none"
                  >
                    <option value="Augmented Human">Augmented Human</option>
                    <option value="Synthetic Android">Synthetic Android</option>
                    <option value="Xenobiotic Hybrid">Xenobiotic Hybrid</option>
                    <option value="Stellar Drifter">Stellar Drifter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 uppercase block mb-1">Background</label>
                <input
                  type="text"
                  value={charBackground}
                  onChange={(e) => setCharBackground(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:border-neon-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 uppercase block mb-2">Attributes (1–20)</label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {Object.keys(charStats).map((stat) => (
                    <div key={stat} className="bg-white/5 p-2 rounded border border-white/10">
                      <span className="text-[10px] text-gray-400 block uppercase">
                        {stat.substring(0, 3)}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={charStats[stat]}
                        onChange={(e) =>
                          setCharStats({ ...charStats, [stat]: Number(e.target.value) })
                        }
                        className="w-full bg-void-bg text-center text-sm font-bold text-white rounded p-1 border border-white/10 mt-1 focus:border-neon-cyan focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateCharModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan font-bold uppercase tracking-wider"
                >
                  {loadingAction ? 'Deploying...' : 'Deploy Operative'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: CREATE CAMPAIGN ──────────────── */}
      {showCreateCampModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-md w-full border-neon-magenta shadow-[0_0_30px_rgba(255,0,170,0.3)] animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display text-base font-bold text-neon-magenta">
                Launch New Campaign
              </h3>
              <button
                onClick={() => setShowCreateCampModal(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 uppercase block mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Nebula Gate Anomaly"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:border-neon-magenta focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 uppercase block mb-1">Mission Briefing</label>
                <textarea
                  rows={3}
                  placeholder="Describe the campaign premise..."
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:border-neon-magenta focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-gray-400 italic">
                * You will automatically be designated as the Dungeon Master (DM) for this campaign.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateCampModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 rounded bg-neon-magenta/20 hover:bg-neon-magenta/30 text-neon-magenta border border-neon-magenta font-bold uppercase tracking-wider"
                >
                  {loadingAction ? 'Initializing...' : 'Start as DM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

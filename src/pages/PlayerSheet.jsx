import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { usePlayerData } from '../hooks/usePlayerData';
import { useCollection } from '../hooks/useCollection';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import CreditCounter from '../components/shared/CreditCounter';
import DnDCharacterHeader from '../components/player/DnDCharacterHeader';
import DnDAbilitySidebar from '../components/player/DnDAbilitySidebar';
import DnDActionsTab from '../components/player/DnDActionsTab';
import InventoryList from '../components/player/InventoryList';
import SpaceshipCard from '../components/player/SpaceshipCard';
import SpaceshipSheet from '../components/player/SpaceshipSheet';
import EESysMarketplace, { EE_CATALOG_ITEMS, MEMBERSHIP_ITEM } from '../components/market/EESysMarketplace';
import TraitsList from '../components/player/TraitsList';
import PlayerNotesTab from '../components/player/PlayerNotesTab';
import DMIntelBroadcast from '../components/shared/DMIntelBroadcast';
import CommsAndRollsFlow from '../components/shared/CommsAndRollsFlow';
import InitiativeRollModal from '../components/player/InitiativeRollModal';
import RestRequestModal from '../components/player/RestRequestModal';
import DiceOverlay from '../components/dice/DiceOverlay';
import { updatePlayerHP, updatePlayerShields, addPlayerNote, removePlayerNote, deleteCharacter, assignShipToPlayer, updatePlayerAvatar, updatePlayerRestUsage } from '../lib/playerActions';
import { advanceCampaignTime, requestPartyRest, clearPartyRest } from '../lib/campaignActions';
import { DEFAULT_IN_GAME_TIME, calculateDailyRestStatus, applyRestToUsage, getGameDateString } from '../lib/calendarUtils';
import { logout } from '../lib/authService';

export default function PlayerSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const activeLocale = i18n.language || 'en';
  const { user, profile } = useAuth();

  const targetId = characterId || user?.uid;
  const { data: player, loading: playerLoading } = usePlayerData(targetId);
  const { docs: allItems = [] } = useCollection('items');
  const { docs: allTraits = [] } = useCollection('traits');

  // Top-Level Sheet Tabs: 'character' | 'ship' | 'market'
  const [mainTab, setMainTab] = useState('character');

  // Character sub-tabs: 'actions' | 'inventory' | 'features' | 'bio'
  const [activeTab, setActiveTab] = useState('actions');
  const [equippedWeapon, setEquippedWeapon] = useState(null);
  const [equippedArmor, setEquippedArmor] = useState(null);

  // Local state overrides for immediate reactivity
  const [localCredits, setLocalCredits] = useState(null);
  const [localInventory, setLocalInventory] = useState(null);
  const [localAvatar, setLocalAvatar] = useState(null);

  const basePlayer = player || profile || {};
  const effectivePlayer = {
    ...basePlayer,
    id: targetId,
    uid: targetId,
    ownerId: basePlayer.ownerId || user?.uid,
    displayName: basePlayer.displayName || basePlayer.name || user?.displayName || user?.email?.split('@')[0] || 'Void Operative',
    role: basePlayer.role || 'player',
    characterClass: basePlayer.characterClass || 'Cyber-Commando',
    level: basePlayer.level || 1,
    proficiencyBonus: basePlayer.proficiencyBonus || 2,
    hp: basePlayer.hp ?? 24,
    maxHp: basePlayer.maxHp ?? 24,
    shields: basePlayer.shields ?? 15,
    maxShields: basePlayer.maxShields ?? 15,
    credits: basePlayer.credits ?? 250,
    speed: basePlayer.speed ?? 30,
    armorClass: basePlayer.armorClass ?? 14,
    stats: basePlayer.stats || { strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
    traits: basePlayer.traits || [],
    inventory: basePlayer.inventory || [],
    avatarUrl: localAvatar || basePlayer.avatarUrl || basePlayer.imageUrl || basePlayer.photoURL || null,
  };

  // Reset local state overrides whenever operative targetId changes
  React.useEffect(() => {
    setLocalShip(null);
    setLocalCredits(null);
    setLocalInventory(null);
    setLocalAvatar(null);
    setLocalRestUsage(null);
  }, [targetId]);

  // Track whether combat is active in the campaign
  const [isCombatActive, setIsCombatActive] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    try {
      const combatEnded = localStorage.getItem('unendingvoid:combat_ended');
      const combatOrder = localStorage.getItem('unendingvoid:combat_order');
      if (!combatOrder) return false;
      if (combatEnded) {
        const endedData = JSON.parse(combatEnded);
        const orderData = JSON.parse(combatOrder);
        if ((endedData.timestamp || 0) >= (orderData.timestamp || 0)) {
          return false;
        }
      }
      const order = JSON.parse(combatOrder);
      return Boolean(order && Array.isArray(order.turnOrder) && order.turnOrder.length > 0);
    } catch (_) {
      return false;
    }
  });

  // Campaign In-Game Calendar & Chronometer state
  const [campaignTime, setCampaignTimeState] = useState(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_IN_GAME_TIME;
    return (
      (effectivePlayer?.campaignId && localStorage.getItem(`unendingvoid:campaign_time_${effectivePlayer.campaignId}`)) ||
      localStorage.getItem('unendingvoid:ingame_time') ||
      DEFAULT_IN_GAME_TIME
    );
  });

  // Squad Rest Requisition tracking & expiration protection
  const dismissedRestIdsRef = React.useRef(new Set());

  const isRestDismissedOrExpired = React.useCallback((req, cId) => {
    if (!req || !req.status || req.status === 'cancelled') return true;
    if (req.status === 'pending') return false; // Pending requests require opertive attention

    // For resolved (approved or denied):
    if (req.id && dismissedRestIdsRef.current.has(req.id)) return true;
    if (typeof localStorage !== 'undefined') {
      const campKey = cId || effectivePlayer?.campaignId || 'default';
      const storedDismissedId = localStorage.getItem(`unendingvoid:dismissed_rest_${campKey}`);
      if (storedDismissedId && req.id && storedDismissedId === req.id) return true;
    }
    // Expire resolved notifications after 60 seconds
    if (req.resolvedAt && Date.now() - req.resolvedAt > 60000) return true;
    if (!req.resolvedAt && req.requestedAt && Date.now() - req.requestedAt > 120000) return true;
    return false;
  }, [effectivePlayer?.campaignId]);

  // Squad Rest Requisition state
  const [campaignRestRequest, setCampaignRestRequest] = useState(() => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem('unendingvoid:rest_request');
      if (raw) {
        const parsed = JSON.parse(raw);
        const campId = effectivePlayer?.campaignId;
        if (!campId || parsed?.campaignId === campId) {
          const req = parsed.restRequest;
          if (req && req.status === 'pending') return req;
          if (req && (req.status === 'approved' || req.status === 'denied')) {
            const campKey = campId || 'default';
            const storedDismissedId = localStorage.getItem(`unendingvoid:dismissed_rest_${campKey}`);
            if (storedDismissedId && req.id && storedDismissedId === req.id) return null;
            if (req.resolvedAt && Date.now() - req.resolvedAt > 60000) return null;
            if (!req.resolvedAt && req.requestedAt && Date.now() - req.requestedAt > 120000) return null;
            return req;
          }
        }
      }
    } catch (_) {}
    return null;
  });

  // Operative Daily Rest Allowance (2 Short Rests / 1 Long Rest per in-game day)
  const operativeId = effectivePlayer?.id || effectivePlayer?.uid || targetId;
  const [localRestUsage, setLocalRestUsage] = useState(() => {
    if (typeof localStorage === 'undefined' || !operativeId) return null;
    try {
      const raw = localStorage.getItem(`unendingvoid:rest_usage:${operativeId}`);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  });

  const dailyRestStatus = calculateDailyRestStatus(
    localRestUsage || effectivePlayer?.restUsage,
    campaignTime
  );

  const processedRestEventsRef = React.useRef(new Set());

  // Sync restUsage from Firestore when it updates
  React.useEffect(() => {
    if (effectivePlayer?.restUsage) {
      setLocalRestUsage(effectivePlayer.restUsage);
    }
  }, [effectivePlayer?.restUsage]);

  const campaignTimeRef = React.useRef(campaignTime);
  campaignTimeRef.current = campaignTime;
  const localRestUsageRef = React.useRef(localRestUsage);
  localRestUsageRef.current = localRestUsage;
  const effectivePlayerRef = React.useRef(effectivePlayer);
  effectivePlayerRef.current = effectivePlayer;

  const handleUpdateHp = React.useCallback(async (newHp, newShields) => {
    const opId = effectivePlayerRef.current?.id || effectivePlayerRef.current?.uid;
    if (!opId) return;
    try {
      await updatePlayerHP(opId, newHp);
      await updatePlayerShields(opId, newShields);
    } catch (err) {
      console.warn('[PlayerSheet] Local state update only:', err.message);
    }
  }, []);

  const applyApprovedRestOnce = React.useCallback((req, inGameTime, prevTimeInput) => {
    if (!req || req.status !== 'approved') return;
    const restKey = req.id ? `${req.id}_${req.resolvedAt || 'approved'}` : (req.resolvedAt ? `rest_${req.resolvedAt}` : null);
    if (!restKey || processedRestEventsRef.current.has(restKey)) {
      return; // Already processed this rest resolution
    }
    processedRestEventsRef.current.add(restKey);

    const restType = req.type || 'short';
    const currPlayer = effectivePlayerRef.current;
    const newTime = inGameTime || req.inGameTime || req.endTime || campaignTimeRef.current;
    const prevTime = prevTimeInput || req.startTime || campaignTimeRef.current;

    if (newTime) {
      setCampaignTimeState(newTime);
    }

    const currentBaseUsage = currPlayer?.restUsage || localRestUsageRef.current;
    const nextUsage = applyRestToUsage(
      currentBaseUsage,
      restType,
      prevTime,
      newTime
    );
    setLocalRestUsage(nextUsage);

    const opId = currPlayer?.id || currPlayer?.uid;
    if (opId) {
      try {
        localStorage.setItem(`unendingvoid:rest_usage:${opId}`, JSON.stringify(nextUsage));
        updatePlayerRestUsage(opId, nextUsage).catch(() => {});
      } catch (_) {}
    }

    if (restType === 'long') {
      handleUpdateHp(currPlayer?.maxHp || 100, currPlayer?.maxShields || 50);
    } else {
      const conMod = Math.floor(((currPlayer?.stats?.constitution || 10) - 10) / 2);
      const healRoll = Math.floor(Math.random() * 10) + 1 + Math.max(0, conMod);
      const newHp = Math.min(currPlayer?.maxHp || 100, (currPlayer?.hp || 0) + healRoll);
      const newShields = Math.min(currPlayer?.maxShields || 50, (currPlayer?.shields || 0) + 5);
      handleUpdateHp(newHp, newShields);
    }
  }, [handleUpdateHp]);

  React.useEffect(() => {
    if (!effectivePlayer?.campaignId || !db) return;
    const unsub = onSnapshot(
      doc(db, 'campaigns', effectivePlayer.campaignId),
      (snap) => {
        if (snap.exists()) {
          const camp = snap.data();
          const active = Boolean(
            camp?.combatActive &&
            !camp?.combatEnded &&
            Array.isArray(camp?.turnOrder) &&
            camp.turnOrder.length > 0
          );
          setIsCombatActive(active);
          if (camp?.inGameTime) {
            setCampaignTimeState(camp.inGameTime);
          }
          if (camp?.restRequest !== undefined) {
            const req = camp.restRequest;
            if (req && !isRestDismissedOrExpired(req, effectivePlayer.campaignId)) {
              setCampaignRestRequest(req);
            } else {
              setCampaignRestRequest(null);
            }

            // Live rest approval sync from Firestore campaign document
            if (req?.status === 'approved') {
              applyApprovedRestOnce(req, camp.inGameTime, req.startTime);
            }
          }
        } else {
          setIsCombatActive(false);
        }
      },
      (err) => {
        console.warn('[PlayerSheet] Campaign snapshot error:', err);
      }
    );
    return () => unsub();
  }, [effectivePlayer?.campaignId, isRestDismissedOrExpired, applyApprovedRestOnce]);

  // Listen for combat initialization and termination (window events + multi-tab storage)
  React.useEffect(() => {
    const campId = effectivePlayer?.campaignId;
    const handleCombatStart = (e) => {
      const data = e.detail;
      if (data && (!campId || data.campaignId === campId)) {
        setIsCombatActive(true);
        if (data.campaignId) {
          // Auto-open combat board in a new tab/window when combat starts
          window.open(`/combat/${data.campaignId}`, '_blank');
        }
      }
    };

    const handleCombatEnd = () => {
      setIsCombatActive(false);
    };

    const handleTimeUpdated = (e) => {
      const data = e.detail;
      const campId = effectivePlayer?.campaignId;
      if (data && (!campId || data.campaignId === campId) && data.inGameTime) {
        setCampaignTimeState(data.inGameTime);
      }
    };

    const handleRestEvent = (e) => {
      const detail = e.detail;
      if (!detail) return;
      if (!campId || detail.campaignId === campId) {
        const req = detail.restRequest;
        if (req && !isRestDismissedOrExpired(req, campId)) {
          setCampaignRestRequest(req);
        } else {
          setCampaignRestRequest(null);
        }
      }
    };

    const handleRestResolved = (e) => {
      const detail = e.detail;
      if (!detail) return;
      if (!campId || detail.campaignId === campId) {
        const req = detail.restRequest;
        if (req && !isRestDismissedOrExpired(req, campId)) {
          setCampaignRestRequest(req);
        } else {
          setCampaignRestRequest(null);
        }
        if (detail.approved && detail.restRequest) {
          applyApprovedRestOnce(detail.restRequest, detail.inGameTime, detail.previousTime);
        }
      }
    };

    const handleRestCleared = (e) => {
      const detail = e.detail;
      if (!campId || !detail || detail.campaignId === campId) {
        setCampaignRestRequest(null);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'unendingvoid:combat_ended') {
        setIsCombatActive(false);
      } else if (e.key === 'unendingvoid:combat_order') {
        if (!e.newValue) {
          setIsCombatActive(false);
          return;
        }
        try {
          const parsed = JSON.parse(e.newValue);
          const campId = effectivePlayer?.campaignId;
          if (parsed && (!campId || parsed.campaignId === campId)) {
            setIsCombatActive(Boolean(parsed.turnOrder && parsed.turnOrder.length > 0));
          }
        } catch (_) {
          setIsCombatActive(false);
        }
      } else if (
        e.key === `unendingvoid:campaign_time_${effectivePlayer?.campaignId}` ||
        e.key === 'unendingvoid:ingame_time'
      ) {
        if (e.newValue) setCampaignTimeState(e.newValue);
      } else if (e.key === 'unendingvoid:rest_request') {
        if (!e.newValue) {
          setCampaignRestRequest(null);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            if (!campId || parsed.campaignId === campId) {
              const req = parsed.restRequest;
              if (req && !isRestDismissedOrExpired(req, campId)) {
                setCampaignRestRequest(req);
              } else {
                setCampaignRestRequest(null);
              }
            }
          } catch (_) {}
        }
      }
    };

    window.addEventListener('unendingvoid:combat_order_set', handleCombatStart);
    window.addEventListener('unendingvoid:combat_ended', handleCombatEnd);
    window.addEventListener('unendingvoid:time_updated', handleTimeUpdated);
    window.addEventListener('unendingvoid:rest_requested', handleRestEvent);
    window.addEventListener('unendingvoid:rest_voted', handleRestEvent);
    window.addEventListener('unendingvoid:rest_resolved', handleRestResolved);
    window.addEventListener('unendingvoid:rest_cancelled', handleRestEvent);
    window.addEventListener('unendingvoid:rest_cleared', handleRestCleared);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('unendingvoid:combat_order_set', handleCombatStart);
      window.removeEventListener('unendingvoid:combat_ended', handleCombatEnd);
      window.removeEventListener('unendingvoid:time_updated', handleTimeUpdated);
      window.removeEventListener('unendingvoid:rest_requested', handleRestEvent);
      window.removeEventListener('unendingvoid:rest_voted', handleRestEvent);
      window.removeEventListener('unendingvoid:rest_resolved', handleRestResolved);
      window.removeEventListener('unendingvoid:rest_cancelled', handleRestEvent);
      window.removeEventListener('unendingvoid:rest_cleared', handleRestCleared);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [effectivePlayer?.campaignId, effectivePlayer?.maxHp, effectivePlayer?.maxShields, effectivePlayer?.stats, isRestDismissedOrExpired]);

  const equippedShip = allItems.find(
    (it) => it.id === effectivePlayer.spaceship && it.type === 'spaceship'
  );

  const [localShip, setLocalShip] = useState(null);

  const activeShipData = localShip !== null ? localShip : (effectivePlayer.ship || (equippedShip ? {
    id: equippedShip.id,
    name: typeof equippedShip.name === 'object' ? equippedShip.name.en : equippedShip.name,
    hull: equippedShip.hullPoints || 180,
    maxHull: equippedShip.hullPoints || 180,
    shields: 120,
    maxShields: 120,
    subWarpSpeed: equippedShip.speed || 42,
    modules: equippedShip.modules,
    cargoCapacity: equippedShip.cargoCapacity,
    weapons: equippedShip.weapons,
  } : null));

  const hasOwnedShip = Boolean(activeShipData && (activeShipData.name || activeShipData.hull));

  // Dynamic Tab Names (Never say "Player", and show "Your Ship" if unowned)
  const playerName = effectivePlayer.displayName || effectivePlayer.name || 'Anthony';
  const initialShipName = activeShipData
    ? (typeof activeShipData.name === 'object' ? activeShipData.name[activeLocale] || activeShipData.name.en : activeShipData.name)
    : (effectivePlayer.spaceshipName || null);
  const [customShipName, setCustomShipName] = useState(initialShipName || '');
  const shipDisplayName = hasOwnedShip
    ? (customShipName || initialShipName || 'Kusaragi')
    : t('spaceship.yourShip', 'Your Ship');

  const currentCredits = localCredits !== null ? localCredits : (effectivePlayer.credits || 0);

  const [localNotes, setLocalNotes] = useState(null);
  const activeNotes = localNotes !== null ? localNotes : (effectivePlayer.notes || []);

  const handleAddNote = async (newNote) => {
    const updated = [newNote, ...activeNotes.filter((n) => n.id !== newNote.id)];
    setLocalNotes(updated);
    try {
      await addPlayerNote(effectivePlayer.id || effectivePlayer.uid, newNote);
    } catch (err) {
      console.warn('[PlayerSheet] Note saved to local state:', err.message);
    }
  };

  const handleDeleteNote = async (noteToDelete) => {
    const updated = activeNotes.filter((n) => n.id !== noteToDelete.id);
    setLocalNotes(updated);
    try {
      await removePlayerNote(effectivePlayer.id || effectivePlayer.uid, noteToDelete);
    } catch (err) {
      console.warn('[PlayerSheet] Note removed from local state:', err.message);
    }
  };

  const handleDeleteCharacter = async () => {
    const charId = effectivePlayer.id || effectivePlayer.uid;
    const confirmed = window.confirm(
      t(
        'character.confirmDeleteCharacter',
        `Are you sure you want to permanently decommission operative "${playerName}"? This action cannot be undone.`
      )
    );
    if (!confirmed || !charId) return;

    try {
      await deleteCharacter(charId);
      navigate('/dashboard');
    } catch (err) {
      console.error('[PlayerSheet] Error deleting character:', err);
      alert(t('character.deleteFailed', 'Failed to delete operative'));
    }
  };

  // Resolve inventory items
  const rawInventory = localInventory !== null ? localInventory : (effectivePlayer.inventory || []);
  const allKnownCatalog = [MEMBERSHIP_ITEM, ...EE_CATALOG_ITEMS, ...allItems];
  const resolvedItems = rawInventory
    .map((itemOrId) => {
      if (typeof itemOrId === 'object' && itemOrId !== null) return itemOrId;
      if (itemOrId === 'item_ee_membership' || itemOrId === 'ee_membership') {
        return MEMBERSHIP_ITEM;
      }
      return allKnownCatalog.find((it) => it.id === itemOrId);
    })
    .filter(Boolean);

  const playerId = effectivePlayer.id || effectivePlayer.uid;
  const hasLocalEELicense =
    typeof window !== 'undefined' &&
    playerId &&
    localStorage.getItem(`unendingvoid:ee_membership:${playerId}`) === 'true';

  const hasEELicense =
    Boolean(effectivePlayer.hasEEMembership) ||
    hasLocalEELicense ||
    rawInventory.some(
      (it) =>
        it === 'item_ee_membership' ||
        it === 'ee_membership' ||
        it?.id === 'item_ee_membership' ||
        it?.id === 'ee_membership'
    );

  const inventoryItems =
    hasEELicense &&
    !resolvedItems.some((it) => it.id === 'item_ee_membership' || it.id === 'ee_membership')
      ? [MEMBERSHIP_ITEM, ...resolvedItems]
      : resolvedItems;

  if (playerLoading && !player && !profile) return <LoadingSpinner />;

  const handleShortRest = async () => {
    if (dailyRestStatus.shortRestsLeft <= 0) {
      alert(t('rest.dailyShortLimit', 'Daily short rest limit reached (2/2 used for this in-game day).'));
      return;
    }

    if (effectivePlayer?.campaignId) {
      try {
        const req = await requestPartyRest(effectivePlayer.campaignId, effectivePlayer, 'short', campaignTime);
        setCampaignRestRequest(req);
      } catch (err) {
        console.warn('Failed to request squad short rest:', err);
      }
      return;
    }

    // Solo / offline fallback
    const conMod = Math.floor(((effectivePlayer.stats?.constitution || 10) - 10) / 2);
    const healRoll = Math.floor(Math.random() * 10) + 1 + Math.max(0, conMod);
    const newHp = Math.min(effectivePlayer.maxHp || 100, (effectivePlayer.hp || 0) + healRoll);
    const newShields = Math.min(effectivePlayer.maxShields || 50, (effectivePlayer.shields || 0) + 5);

    await handleUpdateHp(newHp, newShields);
    const prevTime = campaignTime;
    let updatedTime = campaignTime;
    try {
      updatedTime = await advanceCampaignTime(null, 2, campaignTime);
      setCampaignTimeState(updatedTime);
    } catch (err) {
      console.warn('Failed to advance rest time:', err);
    }

    const nextUsage = applyRestToUsage(
      localRestUsage || effectivePlayer?.restUsage,
      'short',
      prevTime,
      updatedTime
    );
    setLocalRestUsage(nextUsage);
    if (operativeId) {
      try {
        localStorage.setItem(`unendingvoid:rest_usage:${operativeId}`, JSON.stringify(nextUsage));
        updatePlayerRestUsage(operativeId, nextUsage).catch(() => {});
      } catch (_) {}
    }

    alert(`${t('calendar.shortRestNotice', 'Short Rest Complete (+2 hours elapsed)')}\n${t('vitals.recovered', 'Recovered')} ${healRoll} HP & 5 Shields.`);
  };

  const handleLongRest = async () => {
    if (dailyRestStatus.longRestsLeft <= 0) {
      alert(t('rest.dailyLongLimit', 'Daily long rest limit reached (1/1 used for this in-game day).'));
      return;
    }

    if (effectivePlayer?.campaignId) {
      try {
        const req = await requestPartyRest(effectivePlayer.campaignId, effectivePlayer, 'long', campaignTime);
        setCampaignRestRequest(req);
      } catch (err) {
        console.warn('Failed to request squad long rest:', err);
      }
      return;
    }

    // Solo / offline fallback
    await handleUpdateHp(effectivePlayer.maxHp || 100, effectivePlayer.maxShields || 50);
    const prevLongTime = campaignTime;
    let updatedLongTime = campaignTime;
    try {
      updatedLongTime = await advanceCampaignTime(null, 8, campaignTime);
      setCampaignTimeState(updatedLongTime);
    } catch (err) {
      console.warn('Failed to advance rest time:', err);
    }

    const nextLongUsage = applyRestToUsage(
      localRestUsage || effectivePlayer?.restUsage,
      'long',
      prevLongTime,
      updatedLongTime
    );
    setLocalRestUsage(nextLongUsage);
    if (operativeId) {
      try {
        localStorage.setItem(`unendingvoid:rest_usage:${operativeId}`, JSON.stringify(nextLongUsage));
        updatePlayerRestUsage(operativeId, nextLongUsage).catch(() => {});
      } catch (_) {}
    }

    alert(t('calendar.longRestNotice', 'Long Rest Complete (+8 hours elapsed)'));
  };

  const handleEquip = (itemId) => {
    const item = allItems.find((it) => it.id === itemId);
    if (!item) return;
    if (item.type === 'weapon') {
      setEquippedWeapon(equippedWeapon === itemId ? null : itemId);
    } else if (item.type === 'armor') {
      setEquippedArmor(equippedArmor === itemId ? null : itemId);
    }
  };

  const handleUpdateAvatar = async (avatarUrl) => {
    const charId = effectivePlayer?.id || effectivePlayer?.uid;
    setLocalAvatar(avatarUrl);
    if (!charId) return;
    try {
      await updatePlayerAvatar(charId, avatarUrl);
    } catch (err) {
      console.warn('Failed to update avatar in Firestore:', err);
    }
  };

  const handleCloseRestModal = async () => {
    const currentReq = campaignRestRequest;
    if (currentReq?.id) {
      dismissedRestIdsRef.current.add(currentReq.id);
      if (typeof localStorage !== 'undefined') {
        try {
          const campKey = effectivePlayer?.campaignId || 'default';
          localStorage.setItem(`unendingvoid:dismissed_rest_${campKey}`, currentReq.id);
          localStorage.removeItem('unendingvoid:rest_request');
        } catch (_) {}
      }
    }
    setCampaignRestRequest(null);

    // If this request was already resolved (approved or denied), clear it from campaign Firestore doc so it doesn't linger
    if (
      effectivePlayer?.campaignId &&
      currentReq &&
      (currentReq.status === 'approved' || currentReq.status === 'denied')
    ) {
      try {
        await clearPartyRest(effectivePlayer.campaignId);
      } catch (err) {
        console.warn('[PlayerSheet] Notice clearing party rest:', err);
      }
    }
  };

  return (
    <div className="min-h-dvh bg-void-bg text-white relative p-4 md:p-6 lg:p-8 pb-44 md:pb-52 lg:pb-56 space-y-6">
      {/* 3D Dice Layer */}
      <DiceOverlay user={user} profile={effectivePlayer} isDM={false} modifier={0} />

      {/* Initiative Roll Pop-Up Modal */}
      <InitiativeRollModal
        character={effectivePlayer}
        campaignId={effectivePlayer.campaignId}
        traits={allTraits}
        items={allItems}
      />

      {/* Squad Rest Requisition Modal */}
      <RestRequestModal
        restRequest={campaignRestRequest}
        campaignId={effectivePlayer?.campaignId}
        currentUser={effectivePlayer}
        activeCharacters={[]}
        onClose={handleCloseRestModal}
      />

      {/* Navigation & Breadcrumbs Bar */}
      <div className="flex items-center justify-between glass-panel px-4 py-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="text-neon-cyan hover:underline flex items-center gap-1 font-bold"
          >
            ◀ {t('navigation.returnToHub', 'Return to Hub')}
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300 truncate">{playerName}</span>
        </div>

        <div className="flex items-center gap-3">
          <CreditCounter amount={currentCredits} />
          <LanguageSwitcher />
          <button
            type="button"
            onClick={handleDeleteCharacter}
            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/40 text-[11px] font-mono font-bold transition-all flex items-center gap-1.5"
            title={t('character.deleteCharacter', 'Delete Character')}
          >
            <span>🗑️</span>
            <span className="hidden sm:inline">{t('character.deleteCharacter', 'Delete Character')}</span>
          </button>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-neon-red transition-colors uppercase text-[10px]"
          >
            {t('auth.logout', 'Logout')}
          </button>
        </div>
      </div>

      {/* TOP-LEVEL TABS: [Player Name], [Ship Name], E.E.Sys */}
      <div className="flex items-center gap-2 border-b-2 border-white/10 pb-2 overflow-x-auto">
        {/* Tab 1: Player Name (e.g. Anthony) */}
        <button
          onClick={() => setMainTab('character')}
          className={`px-5 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                     ${mainTab === 'character'
                       ? 'bg-neon-cyan/20 text-neon-cyan border-2 border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                       : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'}`}
        >
          <span>👤</span>
          <span>{playerName}</span>
        </button>

        {/* Tab 2: Ship Name (e.g. Kusaragi) */}
        <button
          onClick={() => setMainTab('ship')}
          className={`px-5 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                     ${mainTab === 'ship'
                       ? 'bg-neon-purple/20 text-purple-300 border-2 border-neon-purple shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                       : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'}`}
        >
          <span>🚀</span>
          <span>{shipDisplayName}</span>
        </button>

        {/* Tab 3: Marketplace (Strictly named E.E.Sys) */}
        <button
          onClick={() => setMainTab('market')}
          className={`px-5 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                     ${mainTab === 'market'
                       ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                       : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'}`}
        >
          <span>🏪</span>
          <span>E.E.Sys</span>
        </button>

        {/* Far Right Side Tab: Live Comms & Quantum Rolls Flow */}
        <div className="ml-auto flex items-center pl-2">
          <button
            onClick={() => setMainTab('flow')}
            className={`px-4 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                       ${mainTab === 'flow'
                         ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                         : 'text-gray-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40'}`}
          >
            <span>📡📜</span>
            <span>{t('flow.tabTitle', 'Live Flow')}</span>
          </button>
        </div>
      </div>

      {effectivePlayer?.campaignId && isCombatActive && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => window.open(`/combat/${effectivePlayer.campaignId}`, '_blank')}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          >
            {t('combat.enterBoard') || '▤ Enter Tactical Combat Board'}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: CHARACTER OPERATIVE SHEET (Named with player's name)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === 'character' && (
        <div className="space-y-6 animate-fade-in">
          {/* D&D Beyond Top Character Header */}
          <DnDCharacterHeader
            character={{ ...effectivePlayer, credits: currentCredits }}
            traits={allTraits}
            items={allItems}
            inGameTime={campaignTime}
            shortRestsLeft={dailyRestStatus.shortRestsLeft}
            longRestsLeft={dailyRestStatus.longRestsLeft}
            onShortRest={handleShortRest}
            onLongRest={handleLongRest}
            onUpdateHp={handleUpdateHp}
            onUpdateAvatar={handleUpdateAvatar}
          />

          {/* Main D&D Beyond 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Ability Scores & Skills */}
            <div className="lg:col-span-1">
              <DnDAbilitySidebar character={effectivePlayer} />
            </div>

            {/* Right Main Area: Sub-tabs */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'actions', label: `⚔️ ${t('sheetTabs.actions', 'Actions & Attacks')}` },
                  { id: 'inventory', label: `🎒 ${t('sheetTabs.inventory', 'Equipment & Cargo')}` },
                  { id: 'features', label: `🧬 ${t('sheetTabs.features', 'Features & Traits')}` },
                  { id: 'notes', label: `📝 ${t('sheetTabs.notes', 'Field Notes & Intel')}` },
                  { id: 'bio', label: `📜 ${t('sheetTabs.bio', 'Operative Dossier')}` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-xs font-display font-bold uppercase tracking-wider transition-all rounded-t-lg
                               ${activeTab === tab.id
                                 ? 'bg-white/10 text-neon-cyan border-b-2 border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* SUB-TAB 1: ACTIONS */}
              {activeTab === 'actions' && (
                <DnDActionsTab
                  character={effectivePlayer}
                  onAddAttack={(updated) => console.log('Updated attacks:', updated)}
                />
              )}

              {/* SUB-TAB 2: INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  <InventoryList
                    items={inventoryItems}
                    equippedWeapon={equippedWeapon || effectivePlayer.equippedWeapon}
                    equippedArmor={equippedArmor || effectivePlayer.equippedArmor}
                    locale={activeLocale}
                    onEquip={handleEquip}
                  />
                </div>
              )}

              {/* SUB-TAB 3: FEATURES & TRAITS */}
              {activeTab === 'features' && (
                <div className="space-y-4">
                  <TraitsList
                    traits={effectivePlayer.traits || []}
                    traitDefs={allTraits}
                    locale={activeLocale}
                  />
                </div>
              )}

              {/* SUB-TAB 4: FIELD NOTES & INTEL ARCHIVE */}
              {activeTab === 'notes' && (
                <PlayerNotesTab
                  notes={activeNotes}
                  onAddNote={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                />
              )}

              {/* SUB-TAB 5: BIO & SHIP SUMMARY */}
              {activeTab === 'bio' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-panel p-5 space-y-3 font-mono text-xs">
                    <h3 className="font-display text-sm font-bold text-white uppercase border-b border-white/10 pb-2">
                      {t('characterStats.dossier', 'Operative Dossier')}
                    </h3>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">{t('characterStats.speciesHeritage', 'Species & Heritage')}</span>
                      <p className="text-white font-bold">
                        {t(`species.${(effectivePlayer.species || 'augmented_human').toLowerCase().replace(/[\s-]+/g, '_')}`, effectivePlayer.species || 'Augmented Human')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">{t('characterStats.background', 'Background')}</span>
                      <p className="text-gray-300">
                        {t(`backgrounds.${(effectivePlayer.background || 'mercenary').toLowerCase().replace(/[\s-]+/g, '_')}`, effectivePlayer.background || 'Mercenary')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">{t('characterStats.combatClassification', 'Combat Classification')}</span>
                      <p className="text-neon-cyan font-bold">
                        {t(`classes.${(effectivePlayer.characterClass || 'operative').toLowerCase().replace(/[\s-]+/g, '_')}`, effectivePlayer.characterClass || 'Operative')}
                      </p>
                    </div>
                  </div>

                  <SpaceshipCard ship={activeShipData || equippedShip} locale={activeLocale} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SPACESHIP CONSOLE (Active Ship or Naval Shipyard)            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === 'ship' && (
        <SpaceshipSheet
          player={{ ...effectivePlayer, credits: currentCredits, hasEEMembership: hasEELicense }}
          ship={activeShipData}
          inventoryItems={inventoryItems}
          onUpdateCredits={(credits) => setLocalCredits(credits)}
          onUpdateInventory={(updatedInv) => setLocalInventory(updatedInv)}
          onUpdateShipName={(name) => {
            setCustomShipName(name);
            if (activeShipData) {
              const updated = { ...activeShipData, name };
              setLocalShip(updated);
              const playerId = effectivePlayer.id || effectivePlayer.uid;
              if (playerId) {
                assignShipToPlayer(playerId, updated).catch((err) =>
                  console.warn('[PlayerSheet] Ship saved to local state:', err.message)
                );
              }
            }
          }}
          onUpdateShip={(newShip) => {
            setLocalShip(newShip);
            if (newShip?.name) {
              setCustomShipName(typeof newShip.name === 'object' ? newShip.name.en : newShip.name);
            }
            const playerId = effectivePlayer.id || effectivePlayer.uid;
            if (playerId && newShip) {
              assignShipToPlayer(playerId, newShip).catch((err) =>
                console.warn('[PlayerSheet] Ship saved to local state:', err.message)
              );
            }
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: EQUIVALENT EXCHANGE SYSTEM // E.E.Sys MARKETPLACE           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === 'market' && (
        <EESysMarketplace
          player={{ ...effectivePlayer, credits: currentCredits, hasEEMembership: hasEELicense }}
          inventoryItems={inventoryItems}
          onUpdateCredits={(credits) => setLocalCredits(credits)}
          onUpdateInventory={(updatedInv) => setLocalInventory(updatedInv)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: LIVE DUAL TELEMETRY FLOW (COMMS + QUANTUM ROLLS)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === 'flow' && (
        <CommsAndRollsFlow
          isDM={false}
          user={user}
          profile={effectivePlayer}
          onSaveToNotes={handleAddNote}
        />
      )}

      {/* Floating Tactical Comms & DM Intel Feed (Read-Only for Player) */}
      <DMIntelBroadcast
        activePlayer={effectivePlayer}
        onSaveToNotes={handleAddNote}
      />
    </div>
  );
}

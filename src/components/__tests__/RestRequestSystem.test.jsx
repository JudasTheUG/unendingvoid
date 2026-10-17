import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '../../lib/i18n';
import RestRequestModal from '../player/RestRequestModal';
import DMRestRequestBanner from '../dm/DMRestRequestBanner';
import DnDCharacterHeader from '../player/DnDCharacterHeader';
import {
  requestPartyRest,
  votePartyRest,
  resolvePartyRest,
  cancelPartyRest,
} from '../../lib/campaignActions';

describe('Squad Rest Requisition & DM Authorization System', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.changeLanguage('en');
  });

  describe('RestRequestModal - Operative UI', () => {
    it('renders waiting state with cancel button for the requesting operative', async () => {
      const restReq = {
        id: 'rest_1',
        type: 'long',
        requesterId: 'user_initiator',
        requesterName: 'Commander Shepard',
        status: 'pending',
        votes: {
          user_initiator: 'agreed',
        },
      };

      const handleClose = vi.fn();
      render(
        <RestRequestModal
          restRequest={restReq}
          campaignId="camp_alpha"
          currentUser={{ id: 'user_initiator', displayName: 'Commander Shepard' }}
          activeCharacters={[{ id: 'user_initiator' }, { id: 'user_operative2' }]}
          onClose={handleClose}
        />
      );

      expect(screen.getByText(/Squad Rest Requisition/i)).toBeInTheDocument();
      expect(screen.getByText(/Commander Shepard is asking for a Long Rest/i)).toBeInTheDocument();
      expect(screen.getByText(/Waiting for squad votes and DM authorization/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel Request/i })).toBeInTheDocument();
    });

    it('renders vote prompt (Agree / Decline) for squad member who has not voted', async () => {
      const restReq = {
        id: 'rest_2',
        type: 'short',
        requesterId: 'user_initiator',
        requesterName: 'Commander Shepard',
        status: 'pending',
        votes: {
          user_initiator: 'agreed',
        },
      };

      render(
        <RestRequestModal
          restRequest={restReq}
          campaignId="camp_alpha"
          currentUser={{ id: 'user_operative2', displayName: 'Garrus' }}
          activeCharacters={[{ id: 'user_initiator' }, { id: 'user_operative2' }]}
        />
      );

      expect(screen.getByText(/Do you agree to take a Short Rest with the squad\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Agree/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
    });

    it('displays confirmation when squad member has agreed or declined', async () => {
      const restReqAgreed = {
        id: 'rest_3',
        type: 'long',
        requesterId: 'user_initiator',
        requesterName: 'Commander Shepard',
        status: 'pending',
        votes: {
          user_initiator: 'agreed',
          user_operative2: 'agreed',
        },
      };

      const { rerender } = render(
        <RestRequestModal
          restRequest={restReqAgreed}
          campaignId="camp_alpha"
          currentUser={{ id: 'user_operative2', displayName: 'Garrus' }}
          activeCharacters={[{ id: 'user_initiator' }, { id: 'user_operative2' }]}
        />
      );

      expect(screen.getByText(/You agreed to take a rest/i)).toBeInTheDocument();

      const restReqDeclined = {
        ...restReqAgreed,
        votes: {
          user_initiator: 'agreed',
          user_operative2: 'declined',
        },
      };

      rerender(
        <RestRequestModal
          restRequest={restReqDeclined}
          campaignId="camp_alpha"
          currentUser={{ id: 'user_operative2', displayName: 'Garrus' }}
          activeCharacters={[{ id: 'user_initiator' }, { id: 'user_operative2' }]}
        />
      );

      expect(screen.getByText(/You declined the rest request/i)).toBeInTheDocument();
    });

    it('renders approved and denied notices when DM resolves request', () => {
      const restReqApproved = {
        id: 'rest_4',
        type: 'long',
        requesterName: 'Commander Shepard',
        status: 'approved',
        votes: { user_initiator: 'agreed' },
      };

      const { rerender } = render(
        <RestRequestModal
          restRequest={restReqApproved}
          campaignId="camp_alpha"
          currentUser={{ id: 'user_initiator' }}
        />
      );

      expect(screen.getByText(/DM authorized the Long Rest! Time advanced and vitals restored/i)).toBeInTheDocument();

      const restReqDenied = {
        ...restReqApproved,
        status: 'denied',
      };

      rerender(
        <RestRequestModal
          restRequest={restReqDenied}
          campaignId="camp_alpha"
          currentUser={{ id: 'user_initiator' }}
        />
      );

      expect(screen.getByText(/DM denied the rest request/i)).toBeInTheDocument();
    });
  });

  describe('DMRestRequestBanner - DM Authorization Bar', () => {
    it('renders vote breakdown with "didnt vote" when squad member has not voted yet', () => {
      const restReq = {
        id: 'rest_dm_1',
        type: 'long',
        requesterId: 'user_p1',
        requesterName: 'Alex Mercer',
        status: 'pending',
        votes: {
          user_p1: 'agreed',
        },
      };

      const players = [{ id: 'user_p1' }, { id: 'user_p2' }];

      render(
        <DMRestRequestBanner
          restRequest={restReq}
          campaignId="camp_alpha"
          players={players}
          currentCampaignTime="2381-05-18T08:00:00"
        />
      );

      // Requester info
      expect(screen.getByText(/Alex Mercer/i)).toBeInTheDocument();
      // 1/2 players asking for Long Rest (1 didn't vote)
      expect(screen.getByText(/1\/2 players asking for Long Rest/i)).toBeInTheDocument();
      expect(screen.getByText(/\(1 didn't vote\)/i)).toBeInTheDocument();

      // Controls
      expect(screen.getByText(/Allow Long Rest\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Allow/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Deny/i })).toBeInTheDocument();
    });

    it('renders vote breakdown with "declined" when a player votes decline', () => {
      const restReq = {
        id: 'rest_dm_2',
        type: 'short',
        requesterId: 'user_p1',
        requesterName: 'Alex Mercer',
        status: 'pending',
        votes: {
          user_p1: 'agreed',
          user_p2: 'declined',
        },
      };

      const players = [{ id: 'user_p1' }, { id: 'user_p2' }];

      render(
        <DMRestRequestBanner
          restRequest={restReq}
          campaignId="camp_alpha"
          players={players}
          currentCampaignTime="2381-05-18T08:00:00"
        />
      );

      // 1/2 players asking for Short Rest (1 declined)
      expect(screen.getByText(/1\/2 players asking for Short Rest/i)).toBeInTheDocument();
      expect(screen.getByText(/\(1 declined\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Allow Short Rest\?/i)).toBeInTheDocument();
    });

    it('renders combined breakdown when some players declined and others did not vote', () => {
      const restReq = {
        id: 'rest_dm_3',
        type: 'long',
        requesterId: 'user_p1',
        requesterName: 'Alex Mercer',
        status: 'pending',
        votes: {
          user_p1: 'agreed',
          user_p2: 'declined',
        },
      };

      const players = [{ id: 'user_p1' }, { id: 'user_p2' }, { id: 'user_p3' }];

      render(
        <DMRestRequestBanner
          restRequest={restReq}
          campaignId="camp_alpha"
          players={players}
          currentCampaignTime="2381-05-18T08:00:00"
        />
      );

      // 1/3 players asking for Long Rest (1 declined, 1 didn't vote)
      expect(screen.getByText(/1\/3 players asking for Long Rest/i)).toBeInTheDocument();
      expect(screen.getByText(/\(1 declined, 1 didn't vote\)/i)).toBeInTheDocument();
    });

    it('triggers resolvePartyRest with approved=true when DM clicks Allow', async () => {
      const restReq = {
        id: 'rest_dm_4',
        type: 'short',
        requesterId: 'user_p1',
        requesterName: 'Alex Mercer',
        status: 'pending',
        votes: { user_p1: 'agreed' },
      };

      const onResolve = vi.fn();
      render(
        <DMRestRequestBanner
          restRequest={restReq}
          campaignId="camp_alpha"
          players={[{ id: 'user_p1' }]}
          currentCampaignTime="2381-05-18T08:00:00"
          onResolve={onResolve}
        />
      );

      const allowBtn = screen.getByRole('button', { name: /Allow/i });
      await act(async () => {
        allowBtn.click();
      });

      expect(onResolve).toHaveBeenCalledWith(true);
    });

    it('triggers resolvePartyRest with approved=false when DM clicks Deny', async () => {
      const restReq = {
        id: 'rest_dm_5',
        type: 'long',
        requesterId: 'user_p1',
        requesterName: 'Alex Mercer',
        status: 'pending',
        votes: { user_p1: 'agreed' },
      };

      const onResolve = vi.fn();
      render(
        <DMRestRequestBanner
          restRequest={restReq}
          campaignId="camp_alpha"
          players={[{ id: 'user_p1' }]}
          currentCampaignTime="2381-05-18T08:00:00"
          onResolve={onResolve}
        />
      );

      const denyBtn = screen.getByRole('button', { name: /Deny/i });
      await act(async () => {
        denyBtn.click();
      });

      expect(onResolve).toHaveBeenCalledWith(false);
    });
  });

  describe('Multi-Language Localization (TR & DE)', () => {
    it('renders Turkish translations without missing keys or hardcoded English', () => {
      i18n.changeLanguage('tr');

      const restReq = {
        id: 'rest_tr',
        type: 'long',
        requesterId: 'user_p1',
        requesterName: 'Tarkan',
        status: 'pending',
        votes: { user_p1: 'agreed' },
      };

      render(
        <DMRestRequestBanner
          restRequest={restReq}
          campaignId="camp_alpha"
          players={[{ id: 'user_p1' }, { id: 'user_p2' }]}
          currentCampaignTime="2381-05-18T08:00:00"
        />
      );

      expect(screen.getByText(/Ekip Mola Onayı/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/2 oyuncu Uzun Mola istiyor/i)).toBeInTheDocument();
      expect(screen.getByText(/\(1 oy kullanmadı\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Uzun Molaya izin verilsin mi\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /İzin Ver/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reddet/i })).toBeInTheDocument();
    });

    it('renders German translations without missing keys or hardcoded English', () => {
      i18n.changeLanguage('de');

      const restReq = {
        id: 'rest_de',
        type: 'short',
        requesterId: 'user_p1',
        requesterName: 'Hans',
        status: 'pending',
        votes: { user_p1: 'agreed' },
      };

      render(
        <DMRestRequestBanner
          restRequest={restReq}
          campaignId="camp_alpha"
          players={[{ id: 'user_p1' }, { id: 'user_p2' }]}
          currentCampaignTime="2381-05-18T08:00:00"
        />
      );

      expect(screen.getByText(/Trupp-Rastgenehmigung/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/2 Spieler fordern eine Kurze Rast an/i)).toBeInTheDocument();
      expect(screen.getByText(/\(1 hat nicht abgestimmt\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Kurze Rast erlauben\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Erlauben/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ablehnen/i })).toBeInTheDocument();
    });
  });

  describe('DnDCharacterHeader - Daily Rest Allowance (2 Short / 1 Long)', () => {
    const mockCharacter = {
      id: 'char_test',
      displayName: 'Captain Rex',
      level: 3,
      hp: 30,
      maxHp: 30,
      shields: 15,
      maxShields: 15,
      stats: { constitution: 14 },
    };

    it('renders initial allowance (2/2) short rests and (1/1) long rest', () => {
      render(
        <DnDCharacterHeader
          character={mockCharacter}
          inGameTime="2381-05-18T08:00:00"
          shortRestsLeft={2}
          longRestsLeft={1}
        />
      );

      expect(screen.getByRole('button', { name: /Short Rest.*2\/2/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Long Rest.*1\/1/i })).toBeEnabled();
    });

    it('disables short rest button and displays (0/2) when short rest limit reached', () => {
      const handleShortRest = vi.fn();
      render(
        <DnDCharacterHeader
          character={mockCharacter}
          inGameTime="2381-05-18T14:00:00"
          shortRestsLeft={0}
          longRestsLeft={1}
          onShortRest={handleShortRest}
        />
      );

      const shortRestBtn = screen.getByRole('button', { name: /Short Rest.*0\/2/i });
      expect(shortRestBtn).toBeDisabled();

      // Clicking disabled button should not trigger callback
      shortRestBtn.click();
      expect(handleShortRest).not.toHaveBeenCalled();
    });

    it('disables long rest button and displays (0/1) when long rest limit reached', () => {
      const handleLongRest = vi.fn();
      render(
        <DnDCharacterHeader
          character={mockCharacter}
          inGameTime="2381-05-18T18:00:00"
          shortRestsLeft={1}
          longRestsLeft={0}
          onLongRest={handleLongRest}
        />
      );

      const longRestBtn = screen.getByRole('button', { name: /Long Rest.*0\/1/i });
      expect(longRestBtn).toBeDisabled();

      longRestBtn.click();
      expect(handleLongRest).not.toHaveBeenCalled();
    });

    it('automatically re-enables allowance when in-game date moves to the next day', () => {
      const charWithUsedRests = {
        ...mockCharacter,
        restUsage: {
          date: '2381-05-18',
          shortRestsUsed: 2,
          longRestsUsed: 1,
        },
      };

      // Day 1: Rests exhausted
      const { rerender } = render(
        <DnDCharacterHeader
          character={charWithUsedRests}
          inGameTime="2381-05-18T22:00:00"
        />
      );

      expect(screen.getByRole('button', { name: /Short Rest.*0\/2/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Long Rest.*0\/1/i })).toBeDisabled();

      // Day 2 (current date > previous date): Automatically resets!
      rerender(
        <DnDCharacterHeader
          character={charWithUsedRests}
          inGameTime="2381-05-19T06:00:00"
        />
      );

      expect(screen.getByRole('button', { name: /Short Rest.*2\/2/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Long Rest.*1\/1/i })).toBeEnabled();
    });
  });
});

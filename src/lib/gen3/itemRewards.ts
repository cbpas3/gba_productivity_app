import type { Reward } from '../../types/reward';

export interface ItemRewardOption {
  id: string;
  label: string;
  description: string;
  reward: Reward;
}

export const ITEM_REWARD_OPTIONS: ItemRewardOption[] = [
  {
    id: 'rare_candy',
    label: 'Rare Candy',
    description: '+100% EXP to next level (level up!)',
    reward: {
      type: 'add_experience_percent',
      targetSlot: 0,
      payload: { kind: 'experience_percent', percent: 100 },
    },
  },
  {
    id: 'hp_up',
    label: 'HP Up',
    description: '+10 HP EVs',
    reward: {
      type: 'boost_evs',
      targetSlot: 0,
      payload: { kind: 'evs', stat: 'hp', amount: 10 },
    },
  },
  {
    id: 'protein',
    label: 'Protein',
    description: '+10 Attack EVs',
    reward: {
      type: 'boost_evs',
      targetSlot: 0,
      payload: { kind: 'evs', stat: 'atk', amount: 10 },
    },
  },
  {
    id: 'iron',
    label: 'Iron',
    description: '+10 Defense EVs',
    reward: {
      type: 'boost_evs',
      targetSlot: 0,
      payload: { kind: 'evs', stat: 'def', amount: 10 },
    },
  },
  {
    id: 'carbos',
    label: 'Carbos',
    description: '+10 Speed EVs',
    reward: {
      type: 'boost_evs',
      targetSlot: 0,
      payload: { kind: 'evs', stat: 'spd', amount: 10 },
    },
  },
  {
    id: 'calcium',
    label: 'Calcium',
    description: '+10 Sp. Atk EVs',
    reward: {
      type: 'boost_evs',
      targetSlot: 0,
      payload: { kind: 'evs', stat: 'spatk', amount: 10 },
    },
  },
  {
    id: 'zinc',
    label: 'Zinc',
    description: '+10 Sp. Def EVs',
    reward: {
      type: 'boost_evs',
      targetSlot: 0,
      payload: { kind: 'evs', stat: 'spdef', amount: 10 },
    },
  },
];

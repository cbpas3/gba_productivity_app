import type { Reward } from '../../types/reward';

export type RewardCategory = 'item' | 'iv' | 'ev';

export interface ItemRewardOption {
  id: string;
  label: string;
  description: string;
  category: RewardCategory;
  reward: Reward;
}

/** Returns the matching option across all categories for a given reward. */
export function findItemOption(reward: Reward): ItemRewardOption | undefined {
  return ALL_REWARD_OPTIONS.find(
    (opt) =>
      opt.reward.type === reward.type &&
      JSON.stringify(opt.reward.payload) === JSON.stringify(reward.payload),
  );
}

// Gen 3 item IDs (FireRed/LeafGreen layout — also used by the old give_item system).
// RSE uses different IDs; if wrong items appear in RSE/Emerald, these need remapping.
const ITEM_IDS = {
  rare_candy: 68,  // 0x44
  hp_up:      81,  // 0x51
  protein:    82,  // 0x52
  iron:       83,  // 0x53
  carbos:     84,  // 0x54
  calcium:    85,  // 0x55
  zinc:       86,  // 0x56
} as const;

export const ITEM_REWARD_OPTIONS: ItemRewardOption[] = [
  {
    id: 'rare_candy',
    label: 'Rare Candy',
    description: 'Pokémon holds Rare Candy',
    category: 'item',
    reward: { type: 'give_item', targetSlot: 0, payload: { kind: 'item', itemId: ITEM_IDS.rare_candy } },
  },
  {
    id: 'hp_up',
    label: 'HP Up',
    description: 'Pokémon holds HP Up',
    category: 'item',
    reward: { type: 'give_item', targetSlot: 0, payload: { kind: 'item', itemId: ITEM_IDS.hp_up } },
  },
  {
    id: 'protein',
    label: 'Protein',
    description: 'Pokémon holds Protein',
    category: 'item',
    reward: { type: 'give_item', targetSlot: 0, payload: { kind: 'item', itemId: ITEM_IDS.protein } },
  },
  {
    id: 'iron',
    label: 'Iron',
    description: 'Pokémon holds Iron',
    category: 'item',
    reward: { type: 'give_item', targetSlot: 0, payload: { kind: 'item', itemId: ITEM_IDS.iron } },
  },
  {
    id: 'carbos',
    label: 'Carbos',
    description: 'Pokémon holds Carbos',
    category: 'item',
    reward: { type: 'give_item', targetSlot: 0, payload: { kind: 'item', itemId: ITEM_IDS.carbos } },
  },
  {
    id: 'calcium',
    label: 'Calcium',
    description: 'Pokémon holds Calcium',
    category: 'item',
    reward: { type: 'give_item', targetSlot: 0, payload: { kind: 'item', itemId: ITEM_IDS.calcium } },
  },
  {
    id: 'zinc',
    label: 'Zinc',
    description: 'Pokémon holds Zinc',
    category: 'item',
    reward: { type: 'give_item', targetSlot: 0, payload: { kind: 'item', itemId: ITEM_IDS.zinc } },
  },
];

export const IV_REWARD_OPTIONS: ItemRewardOption[] = [
  {
    id: 'iv_hp',
    label: 'HP IV 31',
    description: 'Set HP IV to 31 (perfect)',
    category: 'iv',
    reward: { type: 'set_ivs', targetSlot: 0, payload: { kind: 'ivs', values: { hp: 31 } } },
  },
  {
    id: 'iv_atk',
    label: 'Atk IV 31',
    description: 'Set Attack IV to 31 (perfect)',
    category: 'iv',
    reward: { type: 'set_ivs', targetSlot: 0, payload: { kind: 'ivs', values: { atk: 31 } } },
  },
  {
    id: 'iv_def',
    label: 'Def IV 31',
    description: 'Set Defense IV to 31 (perfect)',
    category: 'iv',
    reward: { type: 'set_ivs', targetSlot: 0, payload: { kind: 'ivs', values: { def: 31 } } },
  },
  {
    id: 'iv_spd',
    label: 'Spd IV 31',
    description: 'Set Speed IV to 31 (perfect)',
    category: 'iv',
    reward: { type: 'set_ivs', targetSlot: 0, payload: { kind: 'ivs', values: { spd: 31 } } },
  },
  {
    id: 'iv_spatk',
    label: 'Sp.Atk IV 31',
    description: 'Set Sp. Attack IV to 31 (perfect)',
    category: 'iv',
    reward: { type: 'set_ivs', targetSlot: 0, payload: { kind: 'ivs', values: { spatk: 31 } } },
  },
  {
    id: 'iv_spdef',
    label: 'Sp.Def IV 31',
    description: 'Set Sp. Defense IV to 31 (perfect)',
    category: 'iv',
    reward: { type: 'set_ivs', targetSlot: 0, payload: { kind: 'ivs', values: { spdef: 31 } } },
  },
];

export const EV_REWARD_OPTIONS: ItemRewardOption[] = [
  {
    id: 'ev_hp',
    label: '+50 HP EVs',
    description: '+50 HP EVs applied directly',
    category: 'ev',
    reward: { type: 'boost_evs', targetSlot: 0, payload: { kind: 'evs', stat: 'hp', amount: 50 } },
  },
  {
    id: 'ev_atk',
    label: '+50 Atk EVs',
    description: '+50 Attack EVs applied directly',
    category: 'ev',
    reward: { type: 'boost_evs', targetSlot: 0, payload: { kind: 'evs', stat: 'atk', amount: 50 } },
  },
  {
    id: 'ev_def',
    label: '+50 Def EVs',
    description: '+50 Defense EVs applied directly',
    category: 'ev',
    reward: { type: 'boost_evs', targetSlot: 0, payload: { kind: 'evs', stat: 'def', amount: 50 } },
  },
  {
    id: 'ev_spd',
    label: '+50 Spd EVs',
    description: '+50 Speed EVs applied directly',
    category: 'ev',
    reward: { type: 'boost_evs', targetSlot: 0, payload: { kind: 'evs', stat: 'spd', amount: 50 } },
  },
  {
    id: 'ev_spatk',
    label: '+50 Sp.Atk EVs',
    description: '+50 Sp. Attack EVs applied directly',
    category: 'ev',
    reward: { type: 'boost_evs', targetSlot: 0, payload: { kind: 'evs', stat: 'spatk', amount: 50 } },
  },
  {
    id: 'ev_spdef',
    label: '+50 Sp.Def EVs',
    description: '+50 Sp. Defense EVs applied directly',
    category: 'ev',
    reward: { type: 'boost_evs', targetSlot: 0, payload: { kind: 'evs', stat: 'spdef', amount: 50 } },
  },
];

export const ALL_REWARD_OPTIONS: ItemRewardOption[] = [
  ...ITEM_REWARD_OPTIONS,
  ...IV_REWARD_OPTIONS,
  ...EV_REWARD_OPTIONS,
];

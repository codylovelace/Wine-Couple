import { Verdict, WineType } from './types';

export const WINE_TYPE_META: Record<
  WineType,
  { label: string; dotClass: string; barClass: string; textClass: string }
> = {
  red: {
    label: 'Red',
    dotClass: 'bg-[#9f233f]',
    barClass: 'bg-[#9f233f]',
    textClass: 'text-rose-900',
  },
  white: {
    label: 'White',
    dotClass: 'bg-[#cfa642]',
    barClass: 'bg-[#cfa642]',
    textClass: 'text-amber-900',
  },
  rose: {
    label: 'Rosé',
    dotClass: 'bg-[#d97184]',
    barClass: 'bg-[#d97184]',
    textClass: 'text-pink-900',
  },
  sparkling: {
    label: 'Sparkling',
    dotClass: 'bg-[#d6b463]',
    barClass: 'bg-[#d6b463]',
    textClass: 'text-amber-900',
  },
  dessert: {
    label: 'Dessert',
    dotClass: 'bg-[#c67f28]',
    barClass: 'bg-[#c67f28]',
    textClass: 'text-amber-900',
  },
  orange: {
    label: 'Orange',
    dotClass: 'bg-[#c8622e]',
    barClass: 'bg-[#c8622e]',
    textClass: 'text-orange-900',
  },
};

export const WINE_TYPES_LIST: WineType[] = [
  'red',
  'white',
  'rose',
  'sparkling',
  'dessert',
  'orange',
];

export const VERDICT_DOT: Record<Verdict, string> = {
  'loved-it': 'bg-emerald-600',
  'good-value': 'bg-sky-600',
  split: 'bg-violet-600',
  okay: 'bg-stone-500',
  bad: 'bg-rose-600',
};

export const VERDICT_ORDER: Verdict[] = ['loved-it', 'good-value', 'split', 'okay', 'bad'];

import { Verdict, WineType } from './types';

export const WINE_TYPE_META: Record<
  WineType,
  { label: string; dotClass: string; barClass: string; textClass: string }
> = {
  red: {
    label: 'Red',
    dotClass: 'bg-[#a82d48]',
    barClass: 'bg-[#a82d48]',
    textClass: 'text-rose-200',
  },
  white: {
    label: 'White',
    dotClass: 'bg-[#dfc47b]',
    barClass: 'bg-[#dfc47b]',
    textClass: 'text-champagne-200',
  },
  rose: {
    label: 'Rosé',
    dotClass: 'bg-[#e08c99]',
    barClass: 'bg-[#e08c99]',
    textClass: 'text-pink-200',
  },
  sparkling: {
    label: 'Sparkling',
    dotClass: 'bg-[#f0e3bd]',
    barClass: 'bg-[#f0e3bd]',
    textClass: 'text-amber-100',
  },
  dessert: {
    label: 'Dessert',
    dotClass: 'bg-[#cf8e3c]',
    barClass: 'bg-[#cf8e3c]',
    textClass: 'text-amber-200',
  },
  orange: {
    label: 'Orange',
    dotClass: 'bg-[#ce6e3c]',
    barClass: 'bg-[#ce6e3c]',
    textClass: 'text-orange-200',
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
  'loved-it': 'bg-emerald-400',
  'good-value': 'bg-sky-400',
  split: 'bg-violet-400',
  okay: 'bg-stone-400',
  bad: 'bg-rose-400',
};

export const VERDICT_ORDER: Verdict[] = ['loved-it', 'good-value', 'split', 'okay', 'bad'];

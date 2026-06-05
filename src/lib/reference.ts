import type { CategoryId } from './database.types';

export const CATEGORIES: Record<CategoryId, { label: string; icon: string; hue: number }> = {
  meieri: { label: 'Meieri', icon: 'catDairy', hue: 198 },
  kjott: { label: 'Kjøtt', icon: 'catMeat', hue: 8 },
  fisk: { label: 'Fisk', icon: 'catFish', hue: 210 },
  frukt: { label: 'Frukt & grønt', icon: 'catProduce', hue: 128 },
  brod: { label: 'Brød & korn', icon: 'catBread', hue: 36 },
  palegg: { label: 'Pålegg', icon: 'catSpread', hue: 22 },
  ferdig: { label: 'Ferdigmat', icon: 'catReady', hue: 280 },
  drikke: { label: 'Drikke', icon: 'catDrink', hue: 250 },
  snacks: { label: 'Snacks', icon: 'catSnack', hue: 48 },
  annet: { label: 'Annet', icon: 'catOther', hue: 160 },
};

export const LOCATIONS: Record<string, { label: string; icon: string; hue: number; freezer: boolean }> = {
  kjoleskap: { label: 'Kjøleskap', icon: 'locFridge', hue: 198, freezer: false },
  fryser: { label: 'Fryser', icon: 'locFreezer', hue: 210, freezer: true },
  spiskammer: { label: 'Spiskammer', icon: 'locPantry', hue: 32, freezer: false },
};

export const CATEGORY_PRICE: Record<CategoryId, number> = {
  meieri: 25, kjott: 49, fisk: 65, frukt: 22, brod: 34,
  palegg: 32, ferdig: 45, drikke: 28, snacks: 30, annet: 30,
};

export const FREEZER_DAYS: Record<CategoryId, number> = {
  meieri: 60, kjott: 120, fisk: 90, frukt: 300, brod: 90,
  palegg: 60, ferdig: 200, drikke: 120, snacks: 180, annet: 120,
};

export function freezerDaysFor(cat: CategoryId): number {
  return FREEZER_DAYS[cat] ?? 120;
}

export const THAW_DAYS = 3;

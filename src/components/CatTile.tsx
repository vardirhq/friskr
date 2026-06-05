import { CATEGORIES } from '../lib/reference';
import type { CategoryId } from '../lib/database.types';
import { ICON_MAP } from './icons';

interface CatTileProps {
  cat: CategoryId;
  size?: number;
  radius?: number;
}

export function CatTile({ cat, size = 44, radius }: CatTileProps) {
  const meta = CATEGORIES[cat] ?? CATEGORIES.annet;
  const IconCmp = ICON_MAP[meta.icon];
  const r = radius != null ? radius : Math.round(size * 0.32);
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `hsl(${meta.hue} 46% 50% / 0.13)`,
      color: `hsl(${meta.hue} 55% 38%)`,
    }}>
      {IconCmp && <IconCmp size={Math.round(size * 0.5)} />}
    </div>
  );
}

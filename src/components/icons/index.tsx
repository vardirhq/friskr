import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
}

function SvgIcon({ size = 22, strokeWidth = 1.7, children, fill = 'none', ...rest }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => <SvgIcon {...p}><path d="M3.5 11.5 12 4l8.5 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M9.5 19.5v-5h5v5" /></SvgIcon>;
export const IconBox = (p: IconProps) => <SvgIcon {...p}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5" /><path d="M12 12v9" /></SvgIcon>;
export const IconScan = (p: IconProps) => <SvgIcon {...p}><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8" /><path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8" /><path d="M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16" /><path d="M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16" /><path d="M7.5 12h9" /></SvgIcon>;
export const IconLeaf = (p: IconProps) => <SvgIcon {...p}><path d="M5 19c0-7 4-12 14-13 0 0 1 11-7 13-3.5.9-7 0-7 0z" /><path d="M9 15c2-3 4.5-5 7.5-6" /></SvgIcon>;
export const IconSliders = (p: IconProps) => <SvgIcon {...p}><path d="M5 8h9" /><path d="M18 8h1" /><circle cx="16" cy="8" r="2" /><path d="M5 16h1" /><path d="M10 16h9" /><circle cx="8" cy="16" r="2" /></SvgIcon>;
export const IconBell = (p: IconProps) => <SvgIcon {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /></SvgIcon>;
export const IconCal = (p: IconProps) => <SvgIcon {...p}><rect x="4" y="5.5" width="16" height="15" rx="3" /><path d="M4 10h16" /><path d="M8 3.5v3M16 3.5v3" /></SvgIcon>;
export const IconPlus = (p: IconProps) => <SvgIcon {...p}><path d="M12 5v14M5 12h14" /></SvgIcon>;
export const IconMinus = (p: IconProps) => <SvgIcon {...p}><path d="M5 12h14" /></SvgIcon>;
export const IconSearch = (p: IconProps) => <SvgIcon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></SvgIcon>;
export const IconChevR = (p: IconProps) => <SvgIcon {...p}><path d="m9 5 7 7-7 7" /></SvgIcon>;
export const IconChevL = (p: IconProps) => <SvgIcon {...p}><path d="m15 5-7 7 7 7" /></SvgIcon>;
export const IconChevD = (p: IconProps) => <SvgIcon {...p}><path d="m5 9 7 7 7-7" /></SvgIcon>;
export const IconCheck = (p: IconProps) => <SvgIcon {...p}><path d="m5 12.5 4.5 4.5L19 6.5" /></SvgIcon>;
export const IconCheckCircle = (p: IconProps) => <SvgIcon {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></SvgIcon>;
export const IconX = (p: IconProps) => <SvgIcon {...p}><path d="M6 6l12 12M18 6 6 18" /></SvgIcon>;
export const IconTrash = (p: IconProps) => <SvgIcon {...p}><path d="M5 7h14" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M7 7l.8 11a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7" /></SvgIcon>;
export const IconPencil = (p: IconProps) => <SvgIcon {...p}><path d="M14.5 5.5 18.5 9.5 8 20H4v-4z" /><path d="m13 7 4 4" /></SvgIcon>;
export const IconFlash = (p: IconProps) => <SvgIcon {...p}><path d="M13 3 5 13h6l-1 8 8-10h-6z" /></SvgIcon>;
export const IconFlashOff = (p: IconProps) => <SvgIcon {...p}><path d="M13 3 8 9.2M11 13H5l3-3.8M10 21l1-8" /><path d="M4 4l16 16" /></SvgIcon>;
export const IconBellOff = (p: IconProps) => <SvgIcon {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /><path d="M4 4l16 16" /></SvgIcon>;
export const IconCloudOff = (p: IconProps) => <SvgIcon {...p}><path d="M17.5 17.5H7a5 5 0 0 1-.5-9.9A7 7 0 0 1 19 12" /><path d="M4 4l16 16" /></SvgIcon>;
export const IconApple = (p: IconProps) => <SvgIcon {...p}><path d="M12 6c-1.5-2-4-2-5 0-1.5 2.5-.5 7 2 10 .5.8 1 1 1.5 1 .4 0 .8-.2 1.5-1 2.5-3 3.5-7.5 2-10Z" /><path d="M12 6c.5-2 2-3 3-3" /></SvgIcon>;
export const IconGoogle = (p: IconProps) => <SvgIcon {...p}><path d="M20 12.5h-8v2.5h5a5 5 0 1 1-1.4-5.3l1.8-1.8A8 8 0 1 0 20 12.5Z" /></SvgIcon>;
export const IconImage = (p: IconProps) => <SvgIcon {...p}><rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4 3 2.5L16 11l3 4" /></SvgIcon>;
export const IconUsers = (p: IconProps) => <SvgIcon {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3 2.8-4.5 5.5-4.5S14 16 14.5 19" /><path d="M16 5.5a3 3 0 0 1 0 5.5" /><path d="M17 14.6c2 .6 3.3 2 3.5 4.4" /></SvgIcon>;
export const IconGlobe = (p: IconProps) => <SvgIcon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" /></SvgIcon>;
export const IconMoon = (p: IconProps) => <SvgIcon {...p}><path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" /></SvgIcon>;
export const IconCart = (p: IconProps) => <SvgIcon {...p}><path d="M3 4h2l2 11h10l2-7H6.5" /><circle cx="9" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" /></SvgIcon>;
export const IconSpark = (p: IconProps) => <SvgIcon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></SvgIcon>;
export const IconTrend = (p: IconProps) => <SvgIcon {...p}><path d="M4 16l4.5-5 3 3L20 6" /><path d="M15 6h5v5" /></SvgIcon>;
export const IconFilter = (p: IconProps) => <SvgIcon {...p}><path d="M4 6h16M7 12h10M10 18h4" /></SvgIcon>;
export const IconClock = (p: IconProps) => <SvgIcon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></SvgIcon>;
export const IconArrowR = (p: IconProps) => <SvgIcon {...p}><path d="M4 12h15M13 6l6 6-6 6" /></SvgIcon>;
export const IconQr = (p: IconProps) => <SvgIcon {...p}><rect x="4" y="4" width="6" height="6" rx="1.2" /><rect x="14" y="4" width="6" height="6" rx="1.2" /><rect x="4" y="14" width="6" height="6" rx="1.2" /><path d="M14 14h2v2M20 14v6h-6M18 18h2" /></SvgIcon>;
export const IconDots = (p: IconProps) => <SvgIcon {...p}><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></SvgIcon>;
export const IconCopy = (p: IconProps) => <SvgIcon {...p}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></SvgIcon>;
export const IconLink = (p: IconProps) => <SvgIcon {...p}><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" /></SvgIcon>;
export const IconKey = (p: IconProps) => <SvgIcon {...p}><circle cx="8" cy="8" r="4" /><path d="m11 11 7 7M16 16l2-2M14 18l2-2" /></SvgIcon>;
export const IconPhone = (p: IconProps) => <SvgIcon {...p}><rect x="6.5" y="3" width="11" height="18" rx="2.5" /><path d="M10.5 18.5h3" /></SvgIcon>;
export const IconLogout = (p: IconProps) => <SvgIcon {...p}><path d="M14 5.5h-7A1.5 1.5 0 0 0 5.5 7v10A1.5 1.5 0 0 0 7 18.5h7" /><path d="M14 12H20M17.5 9l2.5 3-2.5 3" /></SvgIcon>;
export const IconMail = (p: IconProps) => <SvgIcon {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4.5 7 7.5 6 7.5-6" /></SvgIcon>;
export const IconTag = (p: IconProps) => <SvgIcon {...p}><path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7l7.5 7.5a1.5 1.5 0 0 1 0 2.1l-5.4 5.4a1.5 1.5 0 0 1-2.1 0z" /><circle cx="8.5" cy="8.5" r="1.2" /></SvgIcon>;

// Category icons
export const IconCatDairy = (p: IconProps) => <SvgIcon {...p}><path d="M8 3h8l-1 3v2.5l1.5 2.5V20a1 1 0 0 1-1 1H8.5a1 1 0 0 1-1-1v-9l1.5-2.5V6z" /><path d="M9 12.5h6" /></SvgIcon>;
export const IconCatMeat = (p: IconProps) => <SvgIcon {...p}><path d="M14 4c3.5 0 6 2.5 6 6 0 3-2 5-4.5 5.5l-5.5 4c-2 1.5-5-1.5-3.5-3.5l4-5.5C11 8 11 4 14 4Z" /><circle cx="15" cy="9" r="1.3" /></SvgIcon>;
export const IconCatFish = (p: IconProps) => <SvgIcon {...p}><path d="M3 12c3-4 8-5 12-4 2 .5 4 2 6 4-2 2-4 3.5-6 4-4 1-9 0-12-4Z" /><path d="M15 8.5 18 6M15 15.5 18 18" /><circle cx="7.5" cy="11.5" r="0.8" fill="currentColor" stroke="none" /></SvgIcon>;
export const IconCatProduce = (p: IconProps) => <SvgIcon {...p}><circle cx="11" cy="14" r="6" /><path d="M12 8c0-2 1-4 4-4-.2 2.2-1.3 3.6-3 4" /></SvgIcon>;
export const IconCatBread = (p: IconProps) => <SvgIcon {...p}><path d="M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 0 8v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M9 10v8M13 10v8" /></SvgIcon>;
export const IconCatSpread = (p: IconProps) => <SvgIcon {...p}><rect x="4" y="9" width="16" height="9" rx="2" /><path d="M4 12h16" /><path d="M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></SvgIcon>;
export const IconCatReady = (p: IconProps) => <SvgIcon {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /></SvgIcon>;
export const IconCatDrink = (p: IconProps) => <SvgIcon {...p}><path d="M7 4h10l-1 15a2 2 0 0 1-2 1.8H10A2 2 0 0 1 8 19z" /><path d="M7.5 9h9" /></SvgIcon>;
export const IconCatSnack = (p: IconProps) => <SvgIcon {...p}><path d="M5 8h14l-1.5 11.5a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z" /><path d="M5 8l2-3.5h10L19 8" /></SvgIcon>;
export const IconCatOther = (p: IconProps) => <SvgIcon {...p}><rect x="4.5" y="4.5" width="15" height="15" rx="3.5" /><path d="M12 9v.01M12 12v3" /></SvgIcon>;

// Location icons
export const IconLocFridge = (p: IconProps) => <SvgIcon {...p}><rect x="6" y="3" width="12" height="18" rx="2.5" /><path d="M6 10h12" /><path d="M9 6.5v1.5M9 13v2" /></SvgIcon>;
export const IconLocFreezer = (p: IconProps) => <SvgIcon {...p}><path d="M12 3v18M5 7l14 10M19 7 5 17" /><path d="M12 6.5 9.5 8M12 6.5 14.5 8M12 17.5 9.5 16M12 17.5l2.5 1.5M6.5 10l.3 2.8M17.5 10l-.3 2.8" /></SvgIcon>;
export const IconLocPantry = (p: IconProps) => <SvgIcon {...p}><rect x="4.5" y="4" width="15" height="16" rx="2" /><path d="M4.5 9.5h15M4.5 14.5h15" /><path d="M9 6.6v.6M9 12v.6M9 17v.6" /></SvgIcon>;

// Logo — filled, no stroke
export const IconLogo = ({ size = 22, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" stroke="none"
    style={{ display: 'block', flexShrink: 0 }} {...rest}>
    <path d="M42 80 C28 76 17 63 15 47 C32 53 43 65 42 80 Z" fillOpacity={0.55} />
    <path d="M42 80 C50 56 64 33 87 13 C83 46 66 70 42 80 Z" />
  </svg>
);

// Map from icon key string (used by CATEGORIES/LOCATIONS) to component
export const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  catDairy: IconCatDairy,
  catMeat: IconCatMeat,
  catFish: IconCatFish,
  catProduce: IconCatProduce,
  catBread: IconCatBread,
  catSpread: IconCatSpread,
  catReady: IconCatReady,
  catDrink: IconCatDrink,
  catSnack: IconCatSnack,
  catOther: IconCatOther,
  locFridge: IconLocFridge,
  locFreezer: IconLocFreezer,
  locPantry: IconLocPantry,
  locBox: IconBox,
  locHome: IconHome,
};

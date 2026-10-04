// Configuration and conversion utilities for Consumable Items (Tisu & Plastik)
// Strictly limited to 14 explicit item IDs based on GudangPresisi specifications.

export interface ConsumableItemConfig {
  id: string;
  name: string;
  category: 'TISU' | 'PLASTIK';
  subCategory?: string; // e.g. '50x75', '60x100', '90x120', 'Roll', 'Jumbo', 'Hand Towel', 'Kotak'
  masterUnit: 'roll' | 'pack'; // Unit used by Master Item in Spreadsheet / GAS backend
  allowedUnits: ('roll' | 'pack' | 'lembar')[];
  unitsPerPack?: number; // For plastic: number of sheets per pack
  unitsPerBox?: number;  // For tissue: number of rolls/packs per box
}

export const CONSUMABLE_ITEMS_CONFIG: Record<string, ConsumableItemConfig> = {
  // --- TISU (4 Items) ---
  CHM0029: {
    id: 'CHM0029',
    name: 'Tissue Roll',
    category: 'TISU',
    subCategory: 'Roll',
    masterUnit: 'roll',
    allowedUnits: ['roll'],
    unitsPerBox: 100, // 1 box = 100 roll
  },
  CHM0056: {
    id: 'CHM0056',
    name: 'Tissue Roll Jumbo',
    category: 'TISU',
    subCategory: 'Jumbo',
    masterUnit: 'roll',
    allowedUnits: ['roll'],
    unitsPerBox: 16, // 1 box = 16 roll
  },
  CHM0027: {
    id: 'CHM0027',
    name: 'Tissue Hand Towel',
    category: 'TISU',
    subCategory: 'Hand Towel',
    masterUnit: 'pack',
    allowedUnits: ['pack'],
    unitsPerBox: 24, // 1 box = 24 pack
  },
  CHM0028: {
    id: 'CHM0028',
    name: 'Tissue Kotak',
    category: 'TISU',
    subCategory: 'Kotak',
    masterUnit: 'pack',
    allowedUnits: ['pack'],
    unitsPerBox: 40, // 1 box = 40 pack
  },

  // --- PLASTIK 50x75 (4 Items, 24 lembar / pack) ---
  CHM0020: {
    id: 'CHM0020',
    name: 'Plastik Sampah 50x75',
    category: 'PLASTIK',
    subCategory: '50x75',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 24,
  },
  CHM0042: {
    id: 'CHM0042',
    name: 'Plastik Sampah 50x75',
    category: 'PLASTIK',
    subCategory: '50x75',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 24,
  },
  CHM0039: {
    id: 'CHM0039',
    name: 'Plastik Sampah 50x75',
    category: 'PLASTIK',
    subCategory: '50x75',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 24,
  },
  CHM0036: {
    id: 'CHM0036',
    name: 'Plastik Sampah 50x75',
    category: 'PLASTIK',
    subCategory: '50x75',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 24,
  },

  // --- PLASTIK 60x100 (3 Items, 12 lembar / pack) ---
  CHM0043: {
    id: 'CHM0043',
    name: 'Plastik Sampah 60x100',
    category: 'PLASTIK',
    subCategory: '60x100',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 12,
  },
  CHM0040: {
    id: 'CHM0040',
    name: 'Plastik Sampah 60x100',
    category: 'PLASTIK',
    subCategory: '60x100',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 12,
  },
  CHM0037: {
    id: 'CHM0037',
    name: 'Plastik Sampah 60x100',
    category: 'PLASTIK',
    subCategory: '60x100',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 12,
  },

  // --- PLASTIK 90x120 (3 Items, 6 lembar / pack) ---
  CHM0038: {
    id: 'CHM0038',
    name: 'Plastik Sampah 90x120',
    category: 'PLASTIK',
    subCategory: '90x120',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 6,
  },
  CHM0044: {
    id: 'CHM0044',
    name: 'Plastik Sampah 90x120',
    category: 'PLASTIK',
    subCategory: '90x120',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 6,
  },
  CHM0041: {
    id: 'CHM0041',
    name: 'Plastik Sampah 90x120',
    category: 'PLASTIK',
    subCategory: '90x120',
    masterUnit: 'pack',
    allowedUnits: ['lembar', 'pack'],
    unitsPerPack: 6,
  },
};

export const CONSUMABLE_ITEM_IDS = Object.keys(CONSUMABLE_ITEMS_CONFIG);

export const isConsumableItem = (itemId?: string): boolean => {
  if (!itemId) return false;
  return itemId in CONSUMABLE_ITEMS_CONFIG;
};

export interface ConversionResult {
  isConsumable: boolean;
  category?: 'TISU' | 'PLASTIK';
  masterUnit: string;
  orderUnit: 'roll' | 'pack' | 'lembar';
  orderQty: number;
  sendQty: number; // The quantity in masterUnit to be sent to backend
  conversionText: string; // Explanatory text for the user
  adminConversionText: string; // Compact text for admin views
}

/**
 * Calculates conversion details for a consumable item.
 * @param itemId Master Item ID (e.g. 'CHM0029', 'CHM0020')
 * @param qty Number entered or requested
 * @param selectedUnit The unit selected by user ('lembar' | 'pack' | 'roll')
 */
export function calculateConsumableConversion(
  itemId: string,
  qty: number,
  selectedUnit?: 'roll' | 'pack' | 'lembar'
): ConversionResult {
  const config = CONSUMABLE_ITEMS_CONFIG[itemId];

  if (!config) {
    return {
      isConsumable: false,
      masterUnit: 'UNIT',
      orderUnit: (selectedUnit as any) || 'UNIT',
      orderQty: qty,
      sendQty: qty,
      conversionText: '',
      adminConversionText: '',
    };
  }

  const effectiveUnit = selectedUnit || config.masterUnit;

  // --- TISU CALCULATION ---
  if (config.category === 'TISU') {
    const perBox = config.unitsPerBox || 1;
    const boxCount = qty / perBox;
    const formattedBox = Number.isInteger(boxCount)
      ? `${boxCount}`
      : boxCount.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

    const isExact = Number.isInteger(boxCount);
    const symbol = isExact ? '=' : '≈';
    const convText = `${qty} ${config.masterUnit} ${symbol} ${formattedBox} box`;
    const adminText = `(${symbol} ${formattedBox} box)`;

    return {
      isConsumable: true,
      category: 'TISU',
      masterUnit: config.masterUnit,
      orderUnit: config.masterUnit,
      orderQty: qty,
      sendQty: qty,
      conversionText: convText,
      adminConversionText: adminText,
    };
  }

  // --- PLASTIK CALCULATION ---
  const perPack = config.unitsPerPack || 1;

  if (effectiveUnit === 'lembar') {
    // Round UP to whole pack for backend submission
    const rawPacks = qty / perPack;
    const sendPackQty = Math.max(1, Math.ceil(rawPacks));
    const isExact = Number.isInteger(rawPacks);

    let convText = '';
    if (isExact) {
      convText = `${qty} lembar = ${sendPackQty} pack`;
    } else {
      const formattedRaw = rawPacks.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      convText = `${qty} lembar ≈ ${formattedRaw} pack → dikirim ${sendPackQty} pack`;
    }

    return {
      isConsumable: true,
      category: 'PLASTIK',
      masterUnit: 'pack',
      orderUnit: 'lembar',
      orderQty: qty,
      sendQty: sendPackQty,
      conversionText: convText,
      adminConversionText: `(≈ ${qty} lembar)`,
    };
  }

  // Placed order directly in 'pack'
  const totalSheets = qty * perPack;
  const convText = `${qty} pack (≈ ${totalSheets.toLocaleString('id-ID')} lembar)`;
  const adminText = `(≈ ${totalSheets.toLocaleString('id-ID')} lembar)`;

  return {
    isConsumable: true,
    category: 'PLASTIK',
    masterUnit: 'pack',
    orderUnit: 'pack',
    orderQty: qty,
    sendQty: qty,
    conversionText: convText,
    adminConversionText: adminText,
  };
}

/**
 * Helper specifically for Admin table / picking list display where `qty` is already in backend master unit (`roll` or `pack`).
 */
export function getAdminConsumableBadge(itemId: string, qty: number): string | null {
  const config = CONSUMABLE_ITEMS_CONFIG[itemId];
  if (!config) return null;

  if (config.category === 'TISU') {
    const perBox = config.unitsPerBox || 1;
    const boxCount = qty / perBox;
    const isExact = Number.isInteger(boxCount);
    const formatted = isExact
      ? `${boxCount}`
      : boxCount.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return `(${isExact ? '=' : '≈'} ${formatted} box)`;
  }

  if (config.category === 'PLASTIK') {
    const perPack = config.unitsPerPack || 1;
    const sheets = qty * perPack;
    return `(≈ ${sheets.toLocaleString('id-ID')} lembar)`;
  }

  return null;
}

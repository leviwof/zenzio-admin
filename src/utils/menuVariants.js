export const PORTION_UNITS = ['half', 'full', 'quarter'];
export const COUNT_UNITS = ['pieces'];
export const MEASURE_UNITS = ['ml', 'litre', 'gram', 'kg'];
export const MENU_VARIANT_UNITS = [...PORTION_UNITS, ...COUNT_UNITS, ...MEASURE_UNITS];

export const UNIT_LABELS = {
  half: 'Half',
  full: 'Full',
  quarter: 'Quarter',
  pieces: 'Pieces',
  ml: 'ml',
  litre: 'Litre',
  gram: 'Gram',
  kg: 'kg',
};

export const UNIT_GROUPS = [
  { label: 'Portion Size', units: PORTION_UNITS },
  { label: 'Count', units: COUNT_UNITS },
  { label: 'Volume', units: ['ml', 'litre'] },
  { label: 'Weight', units: ['gram', 'kg'] },
];

export const isPortionUnit = (unit) => PORTION_UNITS.includes(unit);
export const isCountUnit = (unit) => COUNT_UNITS.includes(unit);
export const needsQuantityInput = (unit) => !isPortionUnit(unit);

export const createEmptyMenuVariant = () => ({
  quantity: '',
  unit: 'ml',
  price: '',
});

export const mapMenuVariantsFromApi = (variants = []) =>
  (Array.isArray(variants) ? variants : []).map((variant) => ({
    id: variant.id,
    quantity: isPortionUnit(variant.unit) ? 1 : (variant.quantity ?? variant.quantity_value ?? ''),
    unit: variant.unit || 'ml',
    price: variant.price ?? '',
  }));

export const prepareMenuVariantsForSubmit = (variants = []) => {
  const filledRows = variants.filter((variant) =>
    String(variant.price ?? '').trim() !== '' && String(variant.unit ?? '').trim() !== '',
  );

  const seen = new Set();

  return filledRows.map((variant, index) => {
    const unit = String(variant.unit || '').trim().toLowerCase();
    const price = Number(variant.price);

    if (!MENU_VARIANT_UNITS.includes(unit)) {
      throw new Error('Please select a valid variant unit');
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Variant price must be greater than zero');
    }

    // Portion units have implicit quantity = 1
    const quantity = isPortionUnit(unit) ? 1 : Number(variant.quantity);

    if (!isPortionUnit(unit)) {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Variant quantity must be greater than zero');
      }
      if (isCountUnit(unit) && !Number.isInteger(quantity)) {
        throw new Error('Pieces count must be a whole number (e.g. 1, 2, 6)');
      }
    }

    const duplicateKey = `${unit}:${quantity.toFixed(3)}`;
    if (seen.has(duplicateKey)) {
      throw new Error(`Duplicate variant: ${isPortionUnit(unit) ? UNIT_LABELS[unit] : `${quantity} ${unit}`}`);
    }
    seen.add(duplicateKey);

    return {
      ...(variant.id ? { id: variant.id } : {}),
      quantity,
      unit,
      price,
      sort_order: index,
    };
  });
};

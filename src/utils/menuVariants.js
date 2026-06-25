export const MENU_VARIANT_UNITS = ['ml', 'litre', 'gram', 'kg'];

export const createEmptyMenuVariant = () => ({
  quantity: '',
  unit: 'ml',
  price: '',
});

export const mapMenuVariantsFromApi = (variants = []) =>
  (Array.isArray(variants) ? variants : []).map((variant) => ({
    id: variant.id,
    quantity: variant.quantity ?? variant.quantity_value ?? '',
    unit: variant.unit || 'ml',
    price: variant.price ?? '',
  }));

export const prepareMenuVariantsForSubmit = (variants = []) => {
  const filledRows = variants.filter((variant) =>
    [variant.quantity, variant.unit, variant.price].some((value) => String(value ?? '').trim() !== ''),
  );

  const seen = new Set();

  return filledRows.map((variant, index) => {
    const quantity = Number(variant.quantity);
    const price = Number(variant.price);
    const unit = String(variant.unit || '').trim().toLowerCase();

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Variant quantity must be greater than zero');
    }

    if (!MENU_VARIANT_UNITS.includes(unit)) {
      throw new Error('Please select a valid variant unit');
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Variant price must be greater than zero');
    }

    const duplicateKey = `${quantity.toFixed(3)}:${unit}`;
    if (seen.has(duplicateKey)) {
      throw new Error(`Duplicate variant found: ${quantity} ${unit}`);
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

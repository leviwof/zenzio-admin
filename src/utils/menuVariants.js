export const COUNT_UNITS = ['pieces'];
export const isCountUnit = (unit) => COUNT_UNITS.includes(String(unit || '').trim().toLowerCase());

export const createEmptyMenuVariant = () => ({
  quantity: '',
  unit: '',
  price: '',
});

export const mapMenuVariantsFromApi = (variants = []) =>
  (Array.isArray(variants) ? variants : []).map((variant) => ({
    id: variant.id,
    quantity: variant.quantity ?? variant.quantity_value ?? '',
    unit: variant.unit || '',
    price: variant.price ?? '',
  }));

export const prepareMenuVariantsForSubmit = (variants = []) => {
  const filledRows = variants.filter((variant) =>
    String(variant.price ?? '').trim() !== '' && String(variant.unit ?? '').trim() !== '',
  );

  const seen = new Set();

  return filledRows.map((variant, index) => {
    const unit = String(variant.unit || '').trim().replace(/\s+/g, ' ');
    const price = Number(variant.price);

    if (!unit) {
      throw new Error('Please enter variant unit/size');
    }

    if (unit.length > 50) {
      throw new Error('Variant unit/size must be 50 characters or less');
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Variant price must be greater than zero');
    }

    const quantity = Number(variant.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Variant quantity must be greater than zero');
    }

    if (isCountUnit(unit) && !Number.isInteger(quantity)) {
      throw new Error('Pieces count must be a whole number (e.g. 1, 2, 6)');
    }

    const duplicateKey = `${unit.toLowerCase()}:${quantity.toFixed(3)}`;
    if (seen.has(duplicateKey)) {
      throw new Error(`Duplicate variant: ${quantity} ${unit}`);
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

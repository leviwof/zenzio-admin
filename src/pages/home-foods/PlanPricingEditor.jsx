import { Plus, Trash2 } from 'lucide-react';

export const PLAN_OPTION_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];
export const PLAN_OPTION_LABELS = {
  DAILY: '1 Day',
  TRIAL: '1 Day',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom',
};
export const PLAN_OPTION_DURATIONS = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  CUSTOM: 1,
};

export const normalizePlanOptionType = (value) => {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!text || text === 'TRIAL' || text === '1_DAY') return 'DAILY';
  if (['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'].includes(text)) return text;
  return 'CUSTOM';
};

export const normalizePlanOptions = (plan = {}) => {
  const rawOptions = Array.isArray(plan.planOptions)
    ? plan.planOptions
    : Array.isArray(plan.plan_options)
      ? plan.plan_options
      : [];

  const source = rawOptions.length
    ? rawOptions
    : [{
        type: plan.plan_type || 'MONTHLY',
        duration: plan.duration_days || 30,
        price: plan.price || 0,
      }];

  return source.map((option) => {
    const type = normalizePlanOptionType(option.type || option.plan_type || option.planType);
    return {
      type,
      duration: Number(option.duration ?? option.duration_days ?? option.durationDays ?? PLAN_OPTION_DURATIONS[type] ?? 1),
      price: Number(option.price ?? 0),
    };
  });
};

export const validatePlanOptions = (options = []) => {
  if (!options.length) return 'At least one plan option is required';
  const seen = new Set();
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const type = normalizePlanOptionType(option.type);
    const duration = Number(option.duration);
    const price = Number(option.price);
    if (!Number.isInteger(duration) || duration <= 0) {
      return `Plan option ${index + 1} duration must be greater than 0`;
    }
    if (!Number.isFinite(price) || price <= 0) {
      return `Plan option ${index + 1} price must be greater than 0`;
    }
    if (type !== 'CUSTOM' && seen.has(type)) {
      return `Duplicate plan type is not allowed: ${PLAN_OPTION_LABELS[type] || type}`;
    }
    if (type !== 'CUSTOM') seen.add(type);
  }
  return '';
};

export const buildPlanOptionsPayload = (options = []) => {
  const normalized = normalizePlanOptions({ planOptions: options });
  const first = normalized[0] || { type: 'MONTHLY', duration: 30, price: 0 };
  return {
    plan_type: first.type,
    duration_days: Number(first.duration),
    price: Number(first.price),
    planOptions: normalized.map((option) => ({
      type: option.type,
      duration: Number(option.duration),
      price: Number(option.price),
    })),
  };
};

export const planOptionsLabel = (plan, money) =>
  normalizePlanOptions(plan)
    .map((option) => `${PLAN_OPTION_LABELS[option.type] || option.type}: ${option.duration} days / ${money(option.price)}`)
    .join(', ');

export default function PlanPricingEditor({ value = [], onChange, inputClass = '', compact = false }) {
  const options = normalizePlanOptions({ planOptions: value });

  const updateRow = (index, patch) => {
    onChange(options.map((option, optionIndex) => (
      optionIndex === index ? { ...option, ...patch } : option
    )));
  };

  const addRow = () => {
    const used = new Set(options.map((option) => normalizePlanOptionType(option.type)));
    const nextType = PLAN_OPTION_TYPES.find((type) => type !== 'CUSTOM' && !used.has(type)) || 'CUSTOM';
    onChange([...options, {
      type: nextType,
      duration: PLAN_OPTION_DURATIONS[nextType],
      price: '',
    }]);
  };

  const removeRow = (index) => {
    if (options.length <= 1) return;
    onChange(options.filter((_, optionIndex) => optionIndex !== index));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-2 py-2">Plan Type</th>
              <th className="px-2 py-2">Duration</th>
              <th className="px-2 py-2">Price</th>
              <th className="px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {options.map((option, index) => (
              <tr key={`${option.type}-${index}`}>
                <td className="px-2 py-2">
                  <select
                    value={normalizePlanOptionType(option.type)}
                    onChange={(event) => {
                      const type = event.target.value;
                      updateRow(index, {
                        type,
                        duration: type === 'CUSTOM' ? option.duration : PLAN_OPTION_DURATIONS[type],
                      });
                    }}
                    className={inputClass}
                  >
                    {PLAN_OPTION_TYPES.map((type) => (
                      <option key={type} value={type}>{PLAN_OPTION_LABELS[type]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min="1"
                    value={option.duration}
                    onChange={(event) => updateRow(index, { duration: Number(event.target.value) })}
                    className={inputClass}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={option.price}
                    onChange={(event) => updateRow(index, { price: Number(event.target.value) })}
                    className={inputClass}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={options.length <= 1}
                    className="inline-flex items-center justify-center rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Remove plan option"
                  >
                    <Trash2 size={compact ? 13 : 14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
      >
        <Plus size={13} /> Add Another Plan
      </button>
    </div>
  );
}

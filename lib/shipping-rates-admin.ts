/**
 * 运费管理：CSV 行校验、与现有数据对比（Dry Run）
 */

export type ParsedRateRow = {
  country: string;
  shipping_method: string;
  unit_price: number;
  min_weight: number;
  max_weight: number | null;
  currency: string;
  delivery_days?: string | null;
};

export type ValidationError = {
  rowIndex: number; // 1-based 表体行号（不含表头）
  reason: string;
};

export type ExistingRate = {
  id: string;
  country: string;
  shipping_method: string;
  unit_price: number;
  min_weight: number;
  max_weight: number | null;
  currency: string;
  delivery_days?: string | null;
};

export type ToAddItem = ParsedRateRow & { rowIndex: number };
export type ToUpdateItem = {
  rowIndex: number;
  id: string;
  country: string;
  shipping_method: string;
  min_weight: number;
  max_weight: number | null;
  currency: string;
  old_unit_price: number;
  new_unit_price: number;
  new_row: ParsedRateRow;
};
export type AbnormalItem = { rowIndex: number; reason: string };

export type DryRunResult = {
  errors: ValidationError[];
  toAdd: ToAddItem[];
  toUpdate: ToUpdateItem[];
  abnormal: AbnormalItem[];
};

const DEFAULT_CURRENCY = "CNY";

/**
 * 校验单行：价格为正、国家非空、重量区间合理
 */
export function validateRow(
  row: ParsedRateRow,
  rowIndex: number
): ValidationError[] {
  const errs: ValidationError[] = [];
  const line = rowIndex + 1;

  const country = String(row.country ?? "").trim().toLowerCase();
  if (!country) {
    errs.push({ rowIndex: line, reason: "国家不能为空" });
  }

  const method = String(row.shipping_method ?? "").trim();
  if (!method) {
    errs.push({ rowIndex: line, reason: "运输方式不能为空" });
  }

  const price = Number(row.unit_price);
  if (Number.isNaN(price)) {
    errs.push({ rowIndex: line, reason: "单价必须为数字（不能为字母或非法字符）" });
  } else if (price <= 0) {
    errs.push({ rowIndex: line, reason: "单价必须为正数" });
  }

  const minW = Number(row.min_weight);
  if (Number.isNaN(minW) || minW < 0) {
    errs.push({ rowIndex: line, reason: "起运重(min_weight)必须为非负数" });
  }

  const maxW = row.max_weight != null ? Number(row.max_weight) : null;
  if (maxW !== null && (Number.isNaN(maxW) || maxW < 0)) {
    errs.push({ rowIndex: line, reason: "重量上限(max_weight)必须为非负数" });
  }
  if (maxW !== null && !Number.isNaN(minW) && maxW < minW) {
    errs.push({ rowIndex: line, reason: "重量上限不能小于起运重" });
  }

  const currency = String(row.currency ?? DEFAULT_CURRENCY).trim() || DEFAULT_CURRENCY;
  if (!currency) {
    errs.push({ rowIndex: line, reason: "币种不能为空" });
  }

  return errs;
}

/**
 * 对比解析结果与现有数据，得到：即将新增、即将修改、数据异常
 */
export function compareWithExisting(
  parsed: (ParsedRateRow & { rowIndex: number })[],
  errors: ValidationError[],
  existing: ExistingRate[]
): Omit<DryRunResult, "errors"> {
  const errorRowSet = new Set(errors.map((e) => e.rowIndex));
  const toAdd: ToAddItem[] = [];
  const toUpdate: ToUpdateItem[] = [];
  const abnormal: AbnormalItem[] = errors.map((e) => ({ rowIndex: e.rowIndex, reason: e.reason }));

  const key = (r: { country: string; shipping_method: string; min_weight: number }) =>
    `${r.country}|${r.shipping_method}|${r.min_weight}`;
  const existingMap = new Map(existing.map((e) => [key(e), e]));

  for (const row of parsed) {
    if (errorRowSet.has(row.rowIndex)) continue;

    const country = String(row.country ?? "").trim().toLowerCase();
    const shipping_method = String(row.shipping_method ?? "").trim();
    const min_weight = Number(row.min_weight);
    const max_weight =
      row.max_weight != null ? Number(row.max_weight) : null;
    const unit_price = Number(row.unit_price);
    const currency = String(row.currency ?? DEFAULT_CURRENCY).trim() || DEFAULT_CURRENCY;
    const delivery_days = row.delivery_days != null ? String(row.delivery_days).trim() || null : null;

    const norm: ParsedRateRow = {
      country,
      shipping_method,
      unit_price,
      min_weight: Number.isNaN(min_weight) ? 0 : min_weight,
      max_weight: max_weight != null && !Number.isNaN(max_weight) ? max_weight : null,
      currency,
      delivery_days,
    };

    const k = key(norm);
    const exist = existingMap.get(k);

    if (!exist) {
      toAdd.push({ ...norm, rowIndex: row.rowIndex });
    } else {
      const same =
        exist.unit_price === unit_price &&
        (exist.max_weight ?? null) === (norm.max_weight ?? null) &&
        exist.currency === currency &&
        (exist.delivery_days ?? null) === (norm.delivery_days ?? null);
      if (!same) {
        toUpdate.push({
          rowIndex: row.rowIndex,
          id: exist.id,
          country: norm.country,
          shipping_method: norm.shipping_method,
          min_weight: norm.min_weight,
          max_weight: norm.max_weight,
          currency: norm.currency,
          old_unit_price: exist.unit_price,
          new_unit_price: unit_price,
          new_row: norm,
        });
      }
    }
  }

  return { toAdd, toUpdate, abnormal };
}

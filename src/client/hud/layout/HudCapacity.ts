export type HudLabelMode = "full" | "compact" | "icon";

export interface BottomHudLayout {
  columns: number;
  rows: number;
  labelMode: HudLabelMode;
  usableWidth: number;
}

export function bottomHudLayout(input: {
  width: number;
  height: number;
  safeLeft: number;
  safeRight: number;
  units: number;
}): BottomHudLayout {
  const usableWidth = Math.max(
    0,
    input.width - input.safeLeft - input.safeRight,
  );
  if (input.width > input.height) {
    const perItem = usableWidth / Math.max(1, input.units);
    return {
      columns: Math.max(1, input.units),
      rows: 1,
      labelMode: perItem >= 64 ? "full" : perItem >= 42 ? "compact" : "icon",
      usableWidth,
    };
  }
  const columns = usableWidth >= 360 ? 8 : usableWidth >= 324 ? 6 : 4;
  return {
    columns,
    rows: Math.ceil(input.units / columns),
    labelMode: columns >= 8 ? "compact" : "full",
    usableWidth,
  };
}

export function playerInfoCounterLayout(
  unitCount: number,
  availableWidth: number,
  reservedControlWidth: number,
): { columns: number; rows: number; items: Array<number | null> } {
  const rows =
    Math.max(0, availableWidth - reservedControlWidth) >= unitCount * 38
      ? 1
      : 2;
  const columns = Math.max(1, Math.ceil(unitCount / rows));
  const items: Array<number | null> = Array.from(
    { length: unitCount },
    (_, index) => index,
  );
  while (items.length < columns * rows) items.push(null);
  return { columns, rows, items };
}

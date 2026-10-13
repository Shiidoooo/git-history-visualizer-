// Room kept to the right of the longest bar for its value label.
const VALUE_LABEL_SPACE = "3rem";

export type RankedBarItem = {
  key: string;
  label: string;
  value: number;
  /** Native tooltip with the full detail for this row. */
  title?: string;
};

/**
 * A horizontal bar per row, one color, the value at the bar's tip. For comparing the size of
 * nominal categories, where the bar length already carries the magnitude.
 */
export function RankedBars({ items, ariaLabel }: { items: readonly RankedBarItem[]; ariaLabel: string }) {
  const maxValue = items.reduce((max, item) => Math.max(max, item.value), 1);

  return (
    <ol aria-label={ariaLabel} className="flex flex-col gap-1">
      {items.map((item) => (
        <li
          key={item.key}
          title={item.title}
          className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] items-center gap-2 sm:gap-3 rounded-md px-1.5 sm:px-2 py-1.5 sm:py-1 hover:bg-muted"
        >
          <span className="truncate text-xs sm:text-sm">{item.label}</span>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-4 min-w-0.5 rounded-r-[4px] bg-chart-1"
              style={{ width: `calc((100% - ${VALUE_LABEL_SPACE}) * ${item.value / maxValue})` }}
            />
            <span className="text-xs sm:text-sm font-medium tabular-nums shrink-0">{item.value.toLocaleString("en")}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

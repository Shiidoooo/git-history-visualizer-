"use client";

import { scaleBand, scaleLinear } from "d3";
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChartCard } from "@/components/chart-card";
import { Button } from "@/components/ui/button";
import {
  bucketCommits,
  suggestGranularity,
  type TimelineBucket,
  type TimelineGranularity,
} from "@/lib/analysis/timeline";
import { placeReleases } from "@/lib/analysis/releases";
import type { Release } from "@/lib/api/releases-contract";
import { pickTickIndexes, tickAnchor } from "@/lib/charts/axis";
import { roundedTopBarPath } from "@/lib/charts/bar-path";
import { formatCompact, formatCount, formatDay, pluralize } from "@/lib/format/display";
import { useElementWidth } from "@/lib/ui/use-element-width";

const HEIGHT = 240; // includes the x-axis band, so the card never needs a nested scroll
const MARGIN = { top: 12, right: 8, bottom: 28, left: 40 };
const MAX_BAR_WIDTH = 24;
const BAR_GAP = 2;
const BAR_RADIUS = 4;
// Labels with a year ("Jan 24, 2011") are about twice as wide as without, so they need more room.
// An edge label is shifted by half its width to stay inside the plot, which eats into the gap
// to its neighbor; the spacing leaves enough for that.
const MIN_TICK_SPACING = 96;
const MIN_TICK_SPACING_WITH_YEAR = 150;
const TICK_EDGE = 24;
const TICK_EDGE_WITH_YEAR = 48;
const Y_TICK_COUNT = 4;
const TOOLTIP_WIDTH = 160;
const TOOLTIP_HEIGHT = 52;
const TOOLTIP_OFFSET = 8;
const TOOLTIP_RELEASE_LINE_HEIGHT = 16;
const MAX_TOOLTIP_RELEASES = 2;
const MARKER_RADIUS = 4;
const NO_RELEASES: readonly Release[] = [];

const GRANULARITY_OPTIONS: { value: TimelineGranularity; label: string }[] = [
  { value: "day", label: "Per day" },
  { value: "week", label: "Per week" },
];

function describeBucket(bucket: TimelineBucket, granularity: TimelineGranularity): string {
  const prefix = granularity === "week" ? "Week of " : "";
  return `${formatCount(bucket.count)} ${pluralize(bucket.count, "commit")}, ${prefix}${formatDay(bucket.start, { withYear: true })}`;
}

export function TimelineChart({
  commits,
  releases = NO_RELEASES,
}: {
  commits: readonly { committedAt: string }[];
  releases?: readonly Release[];
}) {
  const [chosenGranularity, setChosenGranularity] = useState<TimelineGranularity | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [containerRef, width] = useElementWidth<HTMLDivElement>();

  // Until the reader picks one, follow the data: long histories read better per week.
  const granularity = chosenGranularity ?? suggestGranularity(commits);
  const buckets = useMemo(() => bucketCommits(commits, granularity), [commits, granularity]);
  const markers = useMemo(() => placeReleases(releases, buckets, granularity), [releases, buckets, granularity]);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxCount = buckets.reduce((max, bucket) => Math.max(max, bucket.count), 1);

  const x = scaleBand<string>()
    .domain(buckets.map((bucket) => bucket.start))
    .range([0, plotWidth]);
  const y = scaleLinear().domain([0, maxCount]).nice().range([plotHeight, 0]);
  const step = x.step();
  const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, step - BAR_GAP));

  const lastIndex = buckets.length - 1;
  const active = activeIndex !== null && activeIndex <= lastIndex ? activeIndex : null;
  const activeBucket = active === null ? null : buckets[active];

  const spansYears = buckets.length > 0 && buckets[0].start.slice(0, 4) !== buckets[lastIndex].start.slice(0, 4);
  const tickSpacing = spansYears ? MIN_TICK_SPACING_WITH_YEAR : MIN_TICK_SPACING;
  const tickEdge = spansYears ? TICK_EDGE_WITH_YEAR : TICK_EDGE;
  const xTicks = pickTickIndexes(buckets.length, Math.max(1, Math.floor(plotWidth / tickSpacing)));
  const yTicks = y.ticks(Y_TICK_COUNT).filter(Number.isInteger);

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    if (buckets.length === 0 || step <= 0) return;
    const offset = event.clientX - event.currentTarget.getBoundingClientRect().left;
    setActiveIndex(Math.min(lastIndex, Math.max(0, Math.floor(offset / step))));
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, number | null> = {
      ArrowRight: active === null ? 0 : Math.min(lastIndex, active + 1),
      ArrowLeft: active === null ? lastIndex : Math.max(0, active - 1),
      Home: 0,
      End: lastIndex,
      Escape: null,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActiveIndex(moves[event.key]);
  }

  function chooseGranularity(next: TimelineGranularity) {
    setChosenGranularity(next);
    setActiveIndex(null);
  }

  const firstBucket = buckets[0];
  const lastBucket = buckets[lastIndex];
  const releaseSummary =
    markers.shownCount > 0 ? ` ${formatCount(markers.shownCount)} ${pluralize(markers.shownCount, "release")} marked.` : "";
  const chartLabel = firstBucket
    ? `Commits ${granularity === "week" ? "per week" : "per day"} from ${formatDay(firstBucket.start, { withYear: true })} to ${formatDay(lastBucket.start, { withYear: true })}.${releaseSummary} Use the left and right arrow keys to inspect each bar.`
    : "No commits to chart.";

  const activeReleases = activeBucket ? (markers.byBucket.get(activeBucket.start) ?? []) : [];
  const shownTooltipReleases = activeReleases.slice(0, MAX_TOOLTIP_RELEASES);
  const hiddenTooltipReleases = activeReleases.length - shownTooltipReleases.length;

  let tooltipStyle: { left: number; top: number } | null = null;
  if (activeBucket && active !== null) {
    const bandLeft = MARGIN.left + (x(activeBucket.start) ?? 0);
    const bandRight = bandLeft + step;
    const placeRight = bandRight + TOOLTIP_OFFSET + TOOLTIP_WIDTH <= width;
    const releaseLines = shownTooltipReleases.length + (hiddenTooltipReleases > 0 ? 1 : 0);
    const tooltipHeight = TOOLTIP_HEIGHT + releaseLines * TOOLTIP_RELEASE_LINE_HEIGHT;
    tooltipStyle = {
      left: Math.max(0, placeRight ? bandRight + TOOLTIP_OFFSET : bandLeft - TOOLTIP_OFFSET - TOOLTIP_WIDTH),
      // Never lower than the plot's floor, so the tooltip does not cover the axis labels.
      top: Math.min(Math.max(0, MARGIN.top + y(activeBucket.count) - 4), MARGIN.top + plotHeight - tooltipHeight),
    };
  }

  return (
    <ChartCard
      title="Commit activity"
      description="How many commits landed in each period."
      actions={
        <div role="group" aria-label="Group commits by" className="flex gap-1">
          {GRANULARITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={granularity === option.value ? "secondary" : "ghost"}
              aria-pressed={granularity === option.value}
              onClick={() => chooseGranularity(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      }
    >
      <div ref={containerRef} className="relative" style={{ height: HEIGHT }}>
        {width > 0 ? (
          <svg
            width={width}
            height={HEIGHT}
            role="group"
            aria-label={chartLabel}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={() => setActiveIndex((current) => current ?? lastIndex)}
            onBlur={() => setActiveIndex(null)}
            className="overflow-visible rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {yTicks.map((tick) => (
                <g key={tick} transform={`translate(0,${y(tick)})`}>
                  <line x1={0} x2={plotWidth} stroke="var(--border)" strokeWidth={1} />
                  <text x={-8} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--muted-foreground)">
                    {formatCompact(tick)}
                  </text>
                </g>
              ))}

              {active !== null && activeBucket ? (
                <rect
                  x={x(activeBucket.start) ?? 0}
                  y={0}
                  width={step}
                  height={plotHeight}
                  fill="var(--muted)"
                />
              ) : null}

              {buckets.map((bucket) => {
                if (bucket.count === 0) return null;
                const barHeight = plotHeight - y(bucket.count);
                const barX = (x(bucket.start) ?? 0) + (step - barWidth) / 2;
                return (
                  <path
                    key={bucket.start}
                    d={roundedTopBarPath(barX, y(bucket.count), barWidth, barHeight, BAR_RADIUS)}
                    fill="var(--chart-1)"
                  />
                );
              })}

              <line x1={0} x2={plotWidth} y1={plotHeight} y2={plotHeight} stroke="var(--border)" strokeWidth={1} />

              {[...markers.byBucket.keys()].map((start) => {
                const position = (x(start) ?? 0) + step / 2;
                return (
                  <g key={`release-${start}`}>
                    <line
                      x1={position}
                      x2={position}
                      y1={0}
                      y2={plotHeight}
                      stroke="var(--foreground)"
                      strokeOpacity={0.35}
                      strokeWidth={1}
                    />
                    <circle
                      cx={position}
                      cy={0}
                      r={MARKER_RADIUS}
                      fill="var(--foreground)"
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  </g>
                );
              })}

              {xTicks.map((index) => {
                const position = (x(buckets[index].start) ?? 0) + step / 2;
                return (
                  <text
                    key={buckets[index].start}
                    x={position}
                    y={plotHeight + 18}
                    textAnchor={tickAnchor(position, plotWidth, tickEdge)}
                    fontSize={12}
                    fill="var(--muted-foreground)"
                  >
                    {formatDay(buckets[index].start, { withYear: spansYears })}
                  </text>
                );
              })}

              <rect
                x={0}
                y={0}
                width={plotWidth}
                height={plotHeight}
                fill="transparent"
                onPointerMove={handlePointerMove}
                onPointerLeave={() => setActiveIndex(null)}
              />
            </g>
          </svg>
        ) : null}

        {tooltipStyle && activeBucket ? (
          <div
            className="pointer-events-none absolute z-10 flex flex-col gap-0.5 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
            style={{ ...tooltipStyle, width: TOOLTIP_WIDTH }}
          >
            <span className="text-base font-semibold">
              {formatCount(activeBucket.count)} {pluralize(activeBucket.count, "commit")}
            </span>
            <span className="text-xs text-muted-foreground">
              {granularity === "week" ? "Week of " : ""}
              {formatDay(activeBucket.start, { withYear: true })}
            </span>
            {shownTooltipReleases.map((release) => (
              <span key={release.tag} className="flex items-center gap-1.5 truncate text-xs">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-foreground" />
                <span className="truncate">Release {release.name}</span>
              </span>
            ))}
            {hiddenTooltipReleases > 0 ? (
              <span className="text-xs text-muted-foreground">+{hiddenTooltipReleases} more</span>
            ) : null}
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {activeBucket
            ? `${describeBucket(activeBucket, granularity)}${activeReleases.length > 0 ? `. Release ${activeReleases.map((release) => release.name).join(", ")}` : ""}`
            : ""}
        </p>
      </div>

      {markers.shownCount > 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-foreground" />
          {formatCount(markers.shownCount)} {pluralize(markers.shownCount, "release")} in this period
          {markers.inRangeCount > markers.shownCount
            ? `, showing the ${formatCount(markers.shownCount)} most recent of ${formatCount(markers.inRangeCount)}`
            : ""}
          .
        </p>
      ) : null}

      <details className="text-sm">
        <summary className="w-fit cursor-pointer rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">
          View as table
        </summary>
        <div
          role="region"
          aria-label="Commit activity table"
          tabIndex={0}
          className="mt-2 max-h-64 overflow-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-ring"
        >
          <table className="w-full text-left">
            <caption className="sr-only">
              Commits {granularity === "week" ? "per week" : "per day"}. Periods with no commits are left out.
            </caption>
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  {granularity === "week" ? "Week starting" : "Day"}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Commits
                </th>
              </tr>
            </thead>
            <tbody>
              {buckets
                .filter((bucket) => bucket.count > 0)
                .map((bucket) => (
                  <tr key={bucket.start} className="border-t border-border">
                    <th scope="row" className="px-3 py-1.5 font-normal">
                      {formatDay(bucket.start, { withYear: true })}
                    </th>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCount(bucket.count)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {markers.shownCount > 0 ? (
            <table className="w-full border-t border-border text-left">
              <caption className="px-3 py-2 text-left font-medium text-muted-foreground">Releases in this period</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Release</th>
                  <th scope="col">Published</th>
                </tr>
              </thead>
              <tbody>
                {[...markers.byBucket.values()].flat().map((release) => (
                  <tr key={release.tag} className="border-t border-border">
                    <th scope="row" className="px-3 py-1.5 font-normal">
                      {release.name}
                    </th>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatDay(release.publishedAt.slice(0, 10), { withYear: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </details>
    </ChartCard>
  );
}

/**
 * Pure geometry for the SVG charts.
 *
 * Everything here maps domain numbers (integer minor units) to view coordinates.
 * It holds no financial meaning and no React — keeping it separable makes the
 * path/arc arithmetic directly testable.
 */

export type ChartPoint = { x: number; y: number };

export type ChartBox = {
  width: number;
  height: number;
  /** Inner padding so strokes and markers are not clipped at the edges. */
  padding: number;
};

/**
 * Projects values onto a box. `min`/`max` bound the value axis; a flat series
 * (min === max) is centred vertically instead of collapsing onto an edge.
 */
export function projectSeries(values: number[], box: ChartBox, min: number, max: number): ChartPoint[] {
  const inner = { width: box.width - box.padding * 2, height: box.height - box.padding * 2 };
  const span = max - min;
  const step = values.length > 1 ? inner.width / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: box.padding + (values.length > 1 ? index * step : inner.width / 2),
    y: span === 0
      ? box.padding + inner.height / 2
      : box.padding + inner.height - ((value - min) / span) * inner.height,
  }));
}

/** `M`/`L` polyline through the points. Empty string for an empty series. */
export function linePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)},${round(point.y)}`)
    .join(' ');
}

/**
 * Smooth curve through the points using a monotone-ish cubic: control points are
 * placed horizontally between neighbours, which never overshoots vertically the
 * way a Catmull-Rom spline can — important when a chart must not imply a value
 * the data never reached.
 */
export function smoothLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length < 3) return linePath(points);
  let path = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    path += ` C${round(midX)},${round(previous.y)} ${round(midX)},${round(current.y)} ${round(current.x)},${round(current.y)}`;
  }
  return path;
}

/** Closes a line path down to `baselineY` so it can be filled as an area. */
export function areaPath(points: ChartPoint[], baselineY: number, smooth = true): string {
  if (points.length === 0) return '';
  const line = smooth ? smoothLinePath(points) : linePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${round(last.x)},${round(baselineY)} L${round(first.x)},${round(baselineY)} Z`;
}

export type DonutSegment = {
  /** Caller's identifier, passed straight through. */
  key: string;
  value: number;
  /** Share of the total, in basis points (10000 = 100%). */
  basisPoints: number;
  startAngle: number;
  endAngle: number;
};

/**
 * Splits values into clockwise arcs starting at 12 o'clock. Non-positive values
 * are dropped: a donut cannot represent a negative share, and silently rendering
 * one as a positive wedge would misstate the data.
 */
export function donutSegments(values: { key: string; value: number }[]): DonutSegment[] {
  const positives = values.filter((entry) => entry.value > 0);
  const total = positives.reduce((sum, entry) => sum + entry.value, 0);
  if (total === 0) return [];
  let angle = -90;
  return positives.map((entry) => {
    const sweep = (entry.value / total) * 360;
    const segment: DonutSegment = {
      key: entry.key,
      value: entry.value,
      basisPoints: Math.round((entry.value / total) * 10000),
      startAngle: angle,
      endAngle: angle + sweep,
    };
    angle += sweep;
    return segment;
  });
}

/**
 * Ring-slice path. A segment covering the full circle is drawn as two half arcs,
 * because a single arc whose start and end coincide renders as nothing.
 */
export function arcPath(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.999) {
    const half = startAngle + 180;
    return `${arcPath(centerX, centerY, outerRadius, innerRadius, startAngle, half)} ${arcPath(centerX, centerY, outerRadius, innerRadius, half, startAngle + 359.999)}`;
  }
  const outerStart = polar(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polar(centerX, centerY, outerRadius, endAngle);
  const innerEnd = polar(centerX, centerY, innerRadius, endAngle);
  const innerStart = polar(centerX, centerY, innerRadius, startAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return [
    `M${round(outerStart.x)},${round(outerStart.y)}`,
    `A${round(outerRadius)},${round(outerRadius)} 0 ${largeArc} 1 ${round(outerEnd.x)},${round(outerEnd.y)}`,
    `L${round(innerEnd.x)},${round(innerEnd.y)}`,
    `A${round(innerRadius)},${round(innerRadius)} 0 ${largeArc} 0 ${round(innerStart.x)},${round(innerStart.y)}`,
    'Z',
  ].join(' ');
}

export function polar(centerX: number, centerY: number, radius: number, degrees: number): ChartPoint {
  const radians = (degrees * Math.PI) / 180;
  return { x: centerX + radius * Math.cos(radians), y: centerY + radius * Math.sin(radians) };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  arcPath,
  areaPath,
  donutSegments,
  linePath,
  projectSeries,
  smoothLinePath,
} from '../src/components/charts/chart-math.ts';

const BOX = { width: 100, height: 100, padding: 10 };

test('projects a series across the full inner width', () => {
  const points = projectSeries([0, 5, 10], BOX, 0, 10);
  assert.equal(points.length, 3);
  assert.equal(points[0].x, 10);
  assert.equal(points[2].x, 90);
  // Highest value sits at the top of the inner box, lowest at the bottom.
  assert.equal(points[0].y, 90);
  assert.equal(points[2].y, 10);
});

test('a flat series is centred rather than collapsed onto an edge', () => {
  const points = projectSeries([7, 7, 7], BOX, 7, 7);
  // padding 10 + inner height 80 / 2
  for (const point of points) assert.equal(point.y, 50);
});

test('a single point is centred horizontally', () => {
  const [point] = projectSeries([3], BOX, 0, 10);
  assert.equal(point.x, 10 + 80 / 2);
});

test('line paths start with a move and continue with line segments', () => {
  const path = linePath(projectSeries([0, 10], BOX, 0, 10));
  assert.match(path, /^M/);
  assert.equal((path.match(/L/g) ?? []).length, 1);
  assert.equal(linePath([]), '');
});

test('a smooth path falls back to straight segments below three points', () => {
  const two = projectSeries([0, 10], BOX, 0, 10);
  assert.equal(smoothLinePath(two), linePath(two));
  assert.match(smoothLinePath(projectSeries([0, 5, 10], BOX, 0, 10)), /C/);
});

test('an area path closes back to the baseline', () => {
  const path = areaPath(projectSeries([0, 10], BOX, 0, 10), 90);
  assert.match(path, /Z$/);
  assert.match(path, /L[\d.]+,90/);
  assert.equal(areaPath([], 90), '');
});

test('donut segments sweep a full turn and carry their share', () => {
  const segments = donutSegments([
    { key: 'a', value: 50 },
    { key: 'b', value: 25 },
    { key: 'c', value: 25 },
  ]);
  assert.equal(segments.length, 3);
  assert.equal(segments[0].startAngle, -90, 'starts at twelve o’clock');
  assert.equal(Math.round(segments[2].endAngle), 270);
  assert.deepEqual(segments.map((segment) => segment.basisPoints), [5000, 2500, 2500]);
});

test('donut segments drop non-positive values instead of inventing wedges', () => {
  const segments = donutSegments([
    { key: 'a', value: 10 },
    { key: 'b', value: 0 },
    { key: 'c', value: -5 },
  ]);
  assert.deepEqual(segments.map((segment) => segment.key), ['a']);
  assert.equal(segments[0].basisPoints, 10000);
  assert.deepEqual(donutSegments([]), []);
  assert.deepEqual(donutSegments([{ key: 'a', value: 0 }]), []);
});

test('a full-circle segment is split so it renders instead of vanishing', () => {
  const single = arcPath(50, 50, 40, 20, -90, 270);
  // Two arcs per half, four in total, rather than a degenerate single sweep.
  assert.equal((single.match(/A/g) ?? []).length, 4);
});

test('arc paths use the large-arc flag past half a turn', () => {
  assert.match(arcPath(50, 50, 40, 20, 0, 200), /A40,40 0 1 1/);
  assert.match(arcPath(50, 50, 40, 20, 0, 90), /A40,40 0 0 1/);
});

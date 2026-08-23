import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countCategoryNodes,
  filterCategoryTree,
  foldForSearch,
} from '../src/features/categories/category-search.ts';

function tree(...groups) {
  return groups.map(([name, ...children]) => ({
    id: name.toLowerCase(),
    name,
    type: 'expense',
    icon: 'other',
    parentCategoryId: null,
    isArchived: false,
    archivedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    subcategories: children.map((child) => ({
      id: child.toLowerCase(),
      name: child,
      type: 'expense',
      icon: 'other',
      parentCategoryId: name.toLowerCase(),
      isArchived: false,
      archivedAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    })),
  }));
}

const sample = tree(
  ['Hogar', 'Mercado', 'Servicios'],
  ['Transporte', 'Taxi', 'Gasolina'],
  ['Salud'],
);

function shape(results) {
  return results.map((category) => [category.name, ...category.subcategories.map((item) => item.name)]);
}

test('folding lowercases, trims and strips Spanish accents', () => {
  assert.equal(foldForSearch('  Café  '), 'cafe');
  assert.equal(foldForSearch('BAÑOS'), 'banos');
  assert.equal(foldForSearch('Educación'), 'educacion');
  assert.equal(foldForSearch(''), '');
});

test('an empty query returns the whole tree', () => {
  assert.deepEqual(shape(filterCategoryTree(sample, '')), shape(sample));
  assert.deepEqual(shape(filterCategoryTree(sample, '   ')), shape(sample));
});

test('a matching category keeps all of its subcategories', () => {
  assert.deepEqual(shape(filterCategoryTree(sample, 'hogar')), [['Hogar', 'Mercado', 'Servicios']]);
});

test('a matching subcategory keeps its parent but only the matching children', () => {
  assert.deepEqual(shape(filterCategoryTree(sample, 'taxi')), [['Transporte', 'Taxi']]);
});

test('search ignores accents and case in both directions', () => {
  const accented = tree(['Educación', 'Colegio']);
  assert.equal(filterCategoryTree(accented, 'educacion').length, 1);
  assert.equal(filterCategoryTree(accented, 'EDUCACIÓN').length, 1);
});

test('a category with no subcategories still matches on its own name', () => {
  assert.deepEqual(shape(filterCategoryTree(sample, 'salud')), [['Salud']]);
});

test('a query matching nothing returns no groups', () => {
  assert.deepEqual(filterCategoryTree(sample, 'zzz'), []);
});

test('partial matches work anywhere in the name', () => {
  assert.deepEqual(shape(filterCategoryTree(sample, 'erca')), [['Hogar', 'Mercado']]);
});

test('filtering never mutates the input tree', () => {
  const before = shape(sample);
  filterCategoryTree(sample, 'taxi');
  assert.deepEqual(shape(sample), before);
});

test('node counting includes parents and children', () => {
  assert.equal(countCategoryNodes(sample), 7);
  assert.equal(countCategoryNodes([]), 0);
});

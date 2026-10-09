import { describe, expect, it } from 'vitest';
import { buildSectionTree, indexSections, leafIds } from '@/services/section-tree';

const rows = [
  { id: 1, parentId: null, slug: 'iluminacao', name: 'Iluminação' },
  { id: 2, parentId: null, slug: 'vestuario', name: 'Vestuário' },
  { id: 3, parentId: 1, slug: 'lampioes', name: 'Lampiões' },
  { id: 4, parentId: 1, slug: 'velas', name: 'Velas' },
  { id: 5, parentId: 2, slug: 'chapeus', name: 'Chapéus' },
];
const counts = [
  { categoryId: 3, count: 10 },
  { categoryId: 4, count: 5 },
];

describe('buildSectionTree', () => {
  const tree = buildSectionTree(rows, counts);

  it('nests children under parents, keeping order', () => {
    expect(tree.map((n) => n.slug)).toEqual(['iluminacao', 'vestuario']);
    expect(tree[0]?.children.map((n) => n.slug)).toEqual(['lampioes', 'velas']);
  });

  it('rolls product counts up to parents, with zero for empty sections', () => {
    expect(tree.map((n) => n.productCount)).toEqual([15, 0]);
  });

  it('indexes slugs (with parents), ids and each node’s top-level section', () => {
    const index = indexSections(tree);
    expect(index.bySlug.get('velas')?.parent?.slug).toBe('iluminacao');
    expect(index.byId.get(5)?.name).toBe('Chapéus');
    expect(index.rootById.get(4)?.name).toBe('Iluminação');
    expect(index.rootById.get(1)?.name).toBe('Iluminação');
  });

  it('expands a section to the leaves products are filed under', () => {
    const index = indexSections(tree);
    expect(leafIds(index.bySlug.get('iluminacao')!.node)).toEqual([3, 4]);
    expect(leafIds(index.bySlug.get('lampioes')!.node)).toEqual([3]);
  });
});

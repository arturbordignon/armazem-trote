// Pure helpers over the section tree. The tree is tiny (dozens of nodes), cached whole, and
// queried in memory, so listings never join `categories` and cards never trigger lookups.
import type { Section, SectionNode } from '@/models/catalog.types';

export interface SectionRow {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
}

export interface SectionCount {
  categoryId: number;
  count: number;
}

/** Builds the forest (rows arrive in display order) and rolls product counts up to parents. */
export function buildSectionTree(
  rows: readonly SectionRow[],
  counts: readonly SectionCount[],
): SectionNode[] {
  const countById = new Map(counts.map((c) => [c.categoryId, c.count]));
  const nodes = new Map<number, SectionNode>(
    rows.map((row) => [row.id, { ...row, productCount: countById.get(row.id) ?? 0, children: [] }]),
  );
  const roots: SectionNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  roots.forEach(rollUpCounts);
  return roots;
}

function rollUpCounts(node: SectionNode): number {
  node.productCount += node.children.reduce((sum, child) => sum + rollUpCounts(child), 0);
  return node.productCount;
}

export interface SectionIndex {
  bySlug: ReadonlyMap<string, { node: SectionNode; parent: SectionNode | null }>;
  byId: ReadonlyMap<number, SectionNode>;
  /** Top-level section of every node, by id: what product cards print. */
  rootById: ReadonlyMap<number, SectionNode>;
}

export function indexSections(roots: readonly SectionNode[]): SectionIndex {
  const bySlug = new Map<string, { node: SectionNode; parent: SectionNode | null }>();
  const byId = new Map<number, SectionNode>();
  const rootById = new Map<number, SectionNode>();
  const visit = (node: SectionNode, parent: SectionNode | null, root: SectionNode) => {
    bySlug.set(node.slug, { node, parent });
    byId.set(node.id, node);
    rootById.set(node.id, root);
    node.children.forEach((child) => visit(child, node, root));
  };
  roots.forEach((root) => visit(root, null, root));
  return { bySlug, byId, rootById };
}

/** Ids of the sections products are filed under (leaves) within `node`, including itself. */
export function leafIds(node: SectionNode): number[] {
  return node.children.length === 0 ? [node.id] : node.children.flatMap(leafIds);
}

export function toSection({ id, slug, name }: SectionNode): Section {
  return { id, slug, name };
}

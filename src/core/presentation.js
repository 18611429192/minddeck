import { findParent, visibleIds } from './tree.js';

export function presentationOrder(root) {
  const defaults = visibleIds(root);
  const visible = new Set(defaults);
  const custom = (root.presentationOrder || []).filter(id => visible.has(id));
  const seen = new Set(custom);
  for (const id of defaults) if (!seen.has(id)) custom.push(id);

  const rootIndex = custom.indexOf(root.id);
  if (rootIndex > 0) {
    custom.splice(rootIndex, 1);
    custom.unshift(root.id);
  } else if (rootIndex < 0) custom.unshift(root.id);
  return custom;
}

export function resolvePresentationIndex(root, order, preferredId, fallbackIndex = 0) {
  let index = order.indexOf(preferredId);
  let parent = findParent(root, preferredId);
  while (index < 0 && parent) {
    index = order.indexOf(parent.id);
    parent = findParent(root, parent.id);
  }
  if (index >= 0) return index;
  return Math.max(0, Math.min(fallbackIndex, Math.max(0, order.length - 1)));
}

export function rebuildPresentation(root, preferredId, fallbackIndex = 0) {
  const order = presentationOrder(root);
  return {
    order,
    index: resolvePresentationIndex(root, order, preferredId, fallbackIndex),
  };
}

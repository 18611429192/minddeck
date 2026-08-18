export function walkAll(root, fn, parent = null, depth = 0) {
  fn(root, parent, depth);
  for (const child of root.children || []) walkAll(child, fn, root, depth + 1);
}

export function walkVisible(root, fn, parent = null, depth = 0) {
  fn(root, parent, depth);
  if (root.collapsed) return;
  for (const child of root.children || []) walkVisible(child, fn, root, depth + 1);
}

export function findNode(root, id) {
  let result = null;
  walkAll(root, node => { if (node.id === id) result = node; });
  return result;
}

export function findParent(root, id) {
  let result = null;
  walkAll(root, (node, parent) => { if (node.id === id) result = parent; });
  return result;
}

export function visibleChildren(node) {
  return node?.collapsed ? [] : (node?.children || []);
}

export function visibleIds(root) {
  const ids = [];
  walkVisible(root, node => ids.push(node.id));
  return ids;
}

export function setAllCollapsed(root, collapsed) {
  walkAll(root, node => {
    if ((node.children || []).length) node.collapsed = collapsed;
  });
  root.collapsed = false;
  return root;
}

import { visibleChildren } from './tree.js';

export const LAYOUTS = ['balanced', 'right', 'left', 'down', 'radial'];

export function subtreeWeight(node) {
  const kids = visibleChildren(node);
  return kids.length ? kids.reduce((sum, child) => sum + subtreeWeight(child), 0) : 1;
}

function layoutHorizontal(branches, side) {
  if (!branches.length) return;
  const X = 330, Y = 165, state = { slot: 0 }, placed = [];
  function assign(node, depth) {
    const kids = visibleChildren(node);
    let y;
    if (!kids.length) y = state.slot++ * Y;
    else {
      const ys = kids.map(child => assign(child, depth + 1));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    node.pos = { x: side * depth * X, y };
    placed.push(node);
    return y;
  }
  branches.forEach(branch => assign(branch, 1));
  const ys = placed.map(node => node.pos.y);
  const shift = (Math.min(...ys) + Math.max(...ys)) / 2;
  placed.forEach(node => { node.pos.y -= shift; });
}

function layoutDown(branches) {
  if (!branches.length) return;
  const X = 220, Y = 245, state = { slot: 0 }, placed = [];
  function assign(node, depth) {
    const kids = visibleChildren(node);
    let x;
    if (!kids.length) x = state.slot++ * X;
    else {
      const xs = kids.map(child => assign(child, depth + 1));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    node.pos = { x, y: depth * Y };
    placed.push(node);
    return x;
  }
  branches.forEach(branch => assign(branch, 1));
  const xs = placed.map(node => node.pos.x);
  const shift = (Math.min(...xs) + Math.max(...xs)) / 2;
  placed.forEach(node => { node.pos.x -= shift; });
}

function layoutRadialChildren(parent, base, depth, parentSpan = .9) {
  const kids = visibleChildren(parent);
  if (!kids.length) return;
  const weights = kids.map(subtreeWeight);
  const total = weights.reduce((a, b) => a + b, 0);
  const dist = 300 + Math.min(depth, 2) * 26;
  let cursor = base - parentSpan / 2;
  kids.forEach((child, i) => {
    const span = parentSpan * weights[i] / total;
    const angle = cursor + span / 2;
    cursor += span;
    child.pos = {
      x: parent.pos.x + Math.cos(angle) * dist,
      y: parent.pos.y + Math.sin(angle) * dist,
    };
    layoutRadialChildren(child, angle, depth + 1, Math.max(.28, span * .88));
  });
}

function layoutRadial(branches) {
  const totalWeight = Math.max(1, branches.reduce((sum, branch) => sum + subtreeWeight(branch), 0));
  let cursor = -Math.PI / 2;
  branches.forEach(branch => {
    const span = Math.PI * 2 * subtreeWeight(branch) / totalWeight;
    const angle = cursor + span / 2;
    cursor += span;
    branch.pos = { x: Math.cos(angle) * 410, y: Math.sin(angle) * 410 };
    layoutRadialChildren(branch, angle, 1, Math.min(1.3, Math.max(.45, span * .72)));
  });
}

export function applyLayout(root, layout = root.mapLayout || 'balanced') {
  if (!LAYOUTS.includes(layout)) layout = 'balanced';
  root.mapLayout = layout;
  root.pos = { x: 0, y: 0 };
  const branches = visibleChildren(root);

  if (layout === 'right') layoutHorizontal(branches, 1);
  else if (layout === 'left') layoutHorizontal(branches, -1);
  else if (layout === 'down') layoutDown(branches);
  else if (layout === 'balanced') {
    const left = [], right = [];
    let leftWeight = 0, rightWeight = 0;
    branches.forEach((branch, index) => {
      const weight = subtreeWeight(branch);
      if (index === 0 || rightWeight <= leftWeight) {
        right.push(branch); rightWeight += weight;
      } else {
        left.push(branch); leftWeight += weight;
      }
    });
    layoutHorizontal(right, 1);
    layoutHorizontal(left, -1);
  } else layoutRadial(branches);

  return root;
}

export function edgePath(a, b, layout = 'radial') {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (layout === 'down') {
    const bend = Math.max(70, Math.abs(dy) * .56), sign = dy >= 0 ? 1 : -1;
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + sign * bend}, ${b.x} ${b.y - sign * bend}, ${b.x} ${b.y}`;
  }
  if (layout === 'left' || layout === 'right' || layout === 'balanced' || Math.abs(dx) >= Math.abs(dy)) {
    const bend = Math.max(80, Math.abs(dx) * .54), sign = dx >= 0 ? 1 : -1;
    return `M ${a.x} ${a.y} C ${a.x + sign * bend} ${a.y}, ${b.x - sign * bend} ${b.y}, ${b.x} ${b.y}`;
  }
  const bend = Math.max(80, Math.abs(dy) * .52), sign = dy >= 0 ? 1 : -1;
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + sign * bend}, ${b.x} ${b.y - sign * bend}, ${b.x} ${b.y}`;
}

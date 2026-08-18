import { walkAll, walkVisible, visibleIds } from './tree.js';
import { LAYOUTS } from './layout.js';
import { presentationOrder } from './presentation.js';

export function inspectProject(project, options = {}) {
  const masterZMin = options.masterZMin ?? 0;
  const masterZMax = options.masterZMax ?? 999;
  const slideZMin = options.slideZMin ?? 1000;
  const slideZMax = options.slideZMax ?? 999999;
  const results = [];
  const nodeIds = new Map();
  const elementIds = new Map();
  const badGeometry = [];
  const badLayers = [];
  const emptyMedia = [];
  let nodeCount = 0;
  let visibleCount = 0;
  let elementCount = 0;

  const push = (level, name, detail) => results.push({ level, name, detail });

  walkAll(project, node => {
    nodeCount += 1;
    if (node.id) nodeIds.set(node.id, (nodeIds.get(node.id) || 0) + 1);
    else push('fail', '节点 ID', `发现没有 ID 的节点：${node.title || '未命名'}`);

    for (const element of node.slideElements || []) {
      elementCount += 1;
      if (element.id) elementIds.set(element.id, (elementIds.get(element.id) || 0) + 1);
      const nums = [element.x, element.y, element.w, element.h].map(Number);
      if (nums.some(value => !Number.isFinite(value)) || Number(element.w) <= 0 || Number(element.h) <= 0) {
        badGeometry.push(`${node.title || node.id} / ${element.type || '元素'}`);
      }
      if (Number(element.z) < slideZMin || Number(element.z) > slideZMax) {
        badLayers.push(`${node.title || node.id} / ${element.id || element.type || '元素'}`);
      }
      if ((element.type === 'image' || element.type === 'video') && !element.src) {
        emptyMedia.push(`${node.title || node.id} / ${element.type}`);
      }
    }
  });

  walkVisible(project, () => { visibleCount += 1; });

  for (const element of project.master?.elements || []) {
    elementCount += 1;
    if (element.id) elementIds.set(element.id, (elementIds.get(element.id) || 0) + 1);
    if (Number(element.z) < masterZMin || Number(element.z) > masterZMax) {
      badLayers.push(`母版 / ${element.id || element.type || '元素'}`);
    }
  }

  const duplicateNodes = [...nodeIds].filter(([, count]) => count > 1).map(([id]) => id);
  const duplicateElements = [...elementIds].filter(([, count]) => count > 1).map(([id]) => id);
  const allNodeIds = new Set(nodeIds.keys());
  const staleOrder = (project.presentationOrder || []).filter(id => !allNodeIds.has(id));

  push(duplicateNodes.length ? 'fail' : 'pass', '节点唯一性', duplicateNodes.length
    ? `重复节点 ID：${duplicateNodes.join(', ')}`
    : `${nodeCount} 个节点 ID 均唯一`);
  push(duplicateElements.length ? 'fail' : 'pass', '元素唯一性', duplicateElements.length
    ? `重复元素 ID：${duplicateElements.join(', ')}`
    : `${elementCount} 个页面/母版元素未发现重复 ID`);
  push(badGeometry.length ? 'fail' : 'pass', '页面几何', badGeometry.length
    ? `发现 ${badGeometry.length} 个尺寸或坐标异常元素`
    : '页面元素坐标和尺寸有效');
  push(badLayers.length ? 'warn' : 'pass', '图层范围', badLayers.length
    ? `发现 ${badLayers.length} 个图层值超出约定范围`
    : '页面与母版图层区间正常');
  push(emptyMedia.length ? 'warn' : 'pass', '媒体资源', emptyMedia.length
    ? `发现 ${emptyMedia.length} 个图片/视频缺少资源地址`
    : '未发现空媒体资源');
  push(staleOrder.length ? 'warn' : 'pass', '演示顺序', staleOrder.length
    ? `存在 ${staleOrder.length} 个已不存在的节点引用`
    : `${presentationOrder(project).length} 个当前可播放节点，顺序引用有效`);
  push(LAYOUTS.includes(project.mapLayout) ? 'pass' : 'fail', '导图布局', LAYOUTS.includes(project.mapLayout)
    ? `当前布局：${project.mapLayout}；当前可见节点 ${visibleCount}`
    : `未知布局：${project.mapLayout}`);

  const tocOk = ['auto', 'show', 'hide'].includes(project.master?.tocVisibility)
    && ['left', 'right'].includes(project.master?.tocSide);
  push(tocOk ? 'pass' : 'fail', '演示目录', tocOk
    ? `目录：${project.master.tocVisibility} / ${project.master.tocSide}`
    : '母版目录显示或位置配置无效');

  const fail = results.filter(item => item.level === 'fail').length;
  const warn = results.filter(item => item.level === 'warn').length;
  const pass = results.filter(item => item.level === 'pass').length;
  return {
    results,
    pass,
    warn,
    fail,
    score: Math.max(0, Math.round(100 - fail * 22 - warn * 5)),
    nodeCount,
    visibleCount,
    elementCount,
    visibleIds: visibleIds(project),
  };
}

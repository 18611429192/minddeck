import { walkAll } from './tree.js';
import { LAYOUTS } from './layout.js';

export const SCHEMA_VERSION = 1;
export const RUNTIME_VERSION = '9.5';

export function normalizeProject(project) {
  if (!project || typeof project !== 'object') throw new Error('Invalid MindDeck project');
  project.schemaVersion ||= SCHEMA_VERSION;
  if (!LAYOUTS.includes(project.mapLayout)) project.mapLayout = 'radial';
  if (!['light', 'dark', 'business', 'minimal'].includes(project.uiTheme)) project.uiTheme = 'light';
  project.presentationOrder ||= [];
  walkAll(project, node => {
    node.children ||= [];
    node.collapsed = !!node.collapsed;
    node.pos ||= { x: 0, y: 0 };
    node.slideElements ||= [];
  });
  return project;
}

export function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

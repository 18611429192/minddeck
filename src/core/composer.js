import { Core } from './runtime.js';

export const deckThemes=Core.DECK_THEMES;
export const pageRoles=Core.PAGE_ROLES;
export const parseOutline=(source)=>Core.Composer.parseOutline(source);
export const composeDeck=(source,options={})=>Core.Composer.compose(source,options);
export const inferPageRole=(node,context={})=>Core.Composer.inferRole(node,context);
export const relayoutPage=(node,options={})=>Core.Composer.relayoutNode(node,options);
export const rethemeDeck=(project,theme,options={})=>Core.Composer.rethemeProject(project,theme,options);
export const describeDeck=(project)=>Core.Composer.describe(project);

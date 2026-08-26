import { LAYOUTS, THEMES, MASTER_Z_MIN, MASTER_Z_MAX, SLIDE_Z_MIN, SLIDE_Z_MAX, Ids, Tree, Theme, Project, Layout, Presentation, Commands } from './modules/model.js';
import { Stage, MapViewport, Fullscreen, Input, Recovery, Diagnostics } from './modules/platform.js';
import { Animation, Element, Slide } from './modules/slide.js';
import { InlineEditor, PresentationSession, MapRenderer, TocRenderer, PresentationView } from './modules/view.js';
import { ExportData, Portable, Architecture } from './modules/portable.js';

export function createMindDeckCore(version){
  return Object.freeze({
    VERSION:version,
    LAYOUTS:Object.freeze(LAYOUTS.slice()),
    THEMES:Object.freeze(THEMES.slice()),
    RANGES:Object.freeze({MASTER_Z_MIN,MASTER_Z_MAX,SLIDE_Z_MIN,SLIDE_Z_MAX}),
    Ids,Tree,Theme,Project,Layout,Presentation,PresentationSession,Commands,Stage,MapViewport,
    Animation,Element,Slide,Fullscreen,Input,Recovery,Diagnostics,InlineEditor,MapRenderer,TocRenderer,
    PresentationView,ExportData,Portable,Architecture
  });
}

import { LAYOUTS, THEMES, MASTER_Z_MIN, MASTER_Z_MAX, SLIDE_Z_MIN, SLIDE_Z_MAX, Ids, Tree, Theme, Project, Layout, Presentation, Commands } from './modules/model.js';
import { DECK_THEMES, PAGE_ROLES, Composer } from './modules/composer.js';
import { SourceDocument } from './modules/source-document.js';
import { Planner } from './modules/planner.js';
import { AIStoryPlanner, OpenAICompatibleProvider } from './modules/ai-provider.js';
import { Stage, MapViewport, Fullscreen, Input, Recovery, Diagnostics } from './modules/platform.js';
import { Animation, Element, Slide } from './modules/slide.js';
import { NativeChart, installNativeChartElement } from './modules/chart.js';
import { NativeTable, NativeDiagram, installStructuredContentElements } from './modules/structured-elements.js';
import { InlineEditor, PresentationSession, MapRenderer, TocRenderer, PresentationView } from './modules/view.js';
import { ExportData, Portable, Architecture } from './modules/portable.js';

export function createMindDeckCore(version){
  installNativeChartElement(Project,Element);
  installStructuredContentElements(Project,Element);
  return Object.freeze({
    VERSION:version,
    LAYOUTS:Object.freeze(LAYOUTS.slice()),
    THEMES:Object.freeze(THEMES.slice()),
    DECK_THEMES,
    PAGE_ROLES,
    RANGES:Object.freeze({MASTER_Z_MIN,MASTER_Z_MAX,SLIDE_Z_MIN,SLIDE_Z_MAX}),
    Ids,Tree,Theme,Project,Layout,Presentation,PresentationSession,Commands,Composer,SourceDocument,Planner,AIStoryPlanner,OpenAICompatibleProvider,Stage,MapViewport,
    Animation,Element,Slide,NativeChart,NativeTable,NativeDiagram,Fullscreen,Input,Recovery,Diagnostics,InlineEditor,MapRenderer,TocRenderer,
    PresentationView,ExportData,Portable,Architecture
  });
}

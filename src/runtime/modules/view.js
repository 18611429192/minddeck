import { global } from './env.js';
import { Tree, Layout, Presentation, Commands } from './model.js';
import { Stage, Fullscreen, Input } from './platform.js';
import { Slide } from './slide.js';

export const InlineEditor={
  start(options={}){
    const node=options.node,element=options.element,field=options.field||'title';
    if(!node||!element)return null;
    const fallbackTitle=options.fallbackTitle||'未命名节点';
    if(field==='text'&&!node.text)element.textContent='';
    element.classList?.remove('empty','inline-empty');
    element.contentEditable='true';element.focus?.();
    if(options.initial!==undefined&&options.initial!==null)element.textContent=String(options.initial);
    const doc=element.ownerDocument||global.document;
    if(doc?.createRange&&global.getSelection){
      const range=doc.createRange(),selection=global.getSelection();
      range.selectNodeContents(element);range.collapse(options.caretAtEnd!==false);
      selection.removeAllRanges();selection.addRange(range);
    }
    let composing=false;
    const sync=()=>{
      let value=String(element.innerText??element.textContent??'').replace(/\n+$/g,'');
      if(field==='title')value=value.replace(/\n/g,' ').trim();
      node[field]=field==='title'?(value||fallbackTitle):value;
      options.onInput?.(node[field],node);
    };
    element.oncompositionstart=()=>{composing=true};
    element.oncompositionend=()=>{composing=false;sync()};
    element.oninput=()=>{if(!composing)sync()};
    element.onkeydown=event=>{
      if(field==='title'&&event.key==='Enter'){event.preventDefault();element.blur()}
      if(event.key==='Escape'){event.preventDefault();element.blur()}
      event.stopPropagation();
    };
    element.onblur=()=>{
      sync();element.contentEditable='false';options.onCommit?.(node[field],node);
    };
    return {sync,stop:()=>element.blur?.()};
  }
};

export const PresentationSession={
  create(root,preferredId=root?.id,fallbackIndex=0){
    const state=Presentation.rebuild(root,preferredId,fallbackIndex);
    const session={
      root,order:state.order,index:state.index,tocOverride:null,
      currentId(){return Presentation.currentId(this.order,this.index,this.root?.id)},
      currentNode(){return Tree.findNode(this.root,this.currentId())||this.root},
      rebuild(preferredId=this.currentId(),fallback=this.index){const next=Presentation.rebuild(this.root,preferredId,fallback);this.order=next.order;this.index=next.index;return this},
      goto(id){this.index=Presentation.goto(this.order,id,this.index);return this},
      step(delta,wrap=true){this.index=Presentation.stepIndex(this.order,this.index,delta,wrap);return this},
      next(wrap=true){return this.step(1,wrap)},prev(wrap=true){return this.step(-1,wrap)},
      first(){this.index=0;return this},last(){this.index=Math.max(0,this.order.length-1);return this},
      ancestors(){return Presentation.ancestors(this.root,this.currentId())},
      configuredTocVisible(width){return Presentation.configuredTocVisible(this.root?.master,width)},
      actualTocVisible(width){return Presentation.actualTocVisible(this.root?.master,width,this.tocOverride)},
      toggleToc(width){this.tocOverride=!this.actualTocVisible(width);return this.actualTocVisible(width)},
      resetToc(){this.tocOverride=null;return this},
      action(action){
        if(action==='next')this.next();
        else if(action==='prev')this.prev();
        else if(action==='first')this.first();
        else if(action==='last')this.last();
        return this;
      },
      setCollapsed(nodeId,value){const keep=this.currentId();Commands.setCollapsed(this.root,nodeId,value);return this.rebuild(keep,this.index)},
      toggleCollapsed(nodeId){const keep=this.currentId();Commands.toggleCollapsed(this.root,nodeId);return this.rebuild(keep,this.index)},
      setAllCollapsed(value){const keep=this.currentId();Commands.setAllCollapsed(this.root,value);return this.rebuild(keep,this.index)}
    };
    return session;
  }
};

export const MapRenderer={
  render(root,options={}){
    const doc=options.document||global.document,nodes=options.nodes,edges=options.edges;
    if(!doc||!nodes||!edges)throw new Error('MapRenderer requires document, nodes and edges');
    nodes.innerHTML='';edges.innerHTML='';
    const fragment=doc.createDocumentFragment(),layout=options.layout||root.mapLayout||'radial';
    const orderMap=options.orderMap||null,selectedId=options.selectedId;
    const classes={
      node:options.nodeClass||'node',root:options.rootClass||'root',selected:options.selectedClass||'selected',
      title:options.titleClass||'title',desc:options.descriptionClass||'desc',meta:options.metaClass||'meta',
      fold:options.foldClass||'fold',badge:options.badgeClass||'order-badge',edge:options.edgeClass||'edge',
      empty:options.emptyDescriptionClass||'inline-empty'
    };
    function addNode(node,parent=null,depth=0){
      if(parent){
        const path=doc.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('class',classes.edge);path.setAttribute('d',Layout.edgePath(parent.pos,node.pos,layout));
        path.dataset.from=parent.id;path.dataset.to=node.id;edges.appendChild(path);
      }
      const el=doc.createElement('div');
      el.className=classes.node+(node.id===root.id?' '+classes.root:'')+(node.id===selectedId?' '+classes.selected:'');
      el.dataset.id=node.id;el.style.left=(Number(node.pos?.x)||0)+'px';el.style.top=(Number(node.pos?.y)||0)+'px';
      if(options.showBadge!==false&&orderMap){
        const badge=doc.createElement('div');badge.className=classes.badge;badge.textContent=orderMap.get(node.id)||'';el.appendChild(badge);
      }
      if((node.children||[]).length){
        const fold=doc.createElement('button');fold.className=classes.fold;fold.textContent=node.collapsed?(options.expandGlyph||'＋'):(options.collapseGlyph||'−');
        fold.onclick=event=>{event.stopPropagation();options.onFold?.(node,event,el)};el.appendChild(fold);
      }
      const title=doc.createElement('div');title.className=classes.title;title.textContent=node.title||'未命名节点';el.appendChild(title);
      if(node.text||options.showEmptyDescription?.(node)){
        const desc=doc.createElement('div');desc.className=classes.desc+(!node.text?' '+classes.empty:'');
        desc.textContent=node.text||(options.emptyDescriptionText||'双击添加说明');el.appendChild(desc);
      }
      const metaText=options.getMeta?.(node,depth);
      if(metaText!==undefined&&metaText!==null&&metaText!==''){
        const meta=doc.createElement('div');meta.className=classes.meta;meta.textContent=String(metaText);el.appendChild(meta);
      }
      if(options.onPointerDown)el.addEventListener('mousedown',event=>options.onPointerDown(node,event,el));
      if(options.onTouchStart)el.addEventListener('touchstart',event=>options.onTouchStart(node,event,el),{passive:false});
      el.onclick=event=>{event.stopPropagation();options.onSelect?.(node,event,el)};
      el.ondblclick=event=>{event.preventDefault();event.stopPropagation();options.onDoubleClick?.(node,event,el)};
      options.decorateNode?.(el,node,depth);
      fragment.appendChild(el);
      if(!node.collapsed)(node.children||[]).forEach(child=>addNode(child,node,depth+1));
    }
    addNode(root,null,0);nodes.appendChild(fragment);
    return {nodes,edges};
  }
};

export const TocRenderer={
  render(container,session,options={}){
    const doc=options.document||global.document;if(!container||!doc||!session)throw new Error('TocRenderer requires container and session');
    container.innerHTML='';
    const active=session.currentId(),ancestors=session.ancestors(),rank=new Map(session.order.map((id,i)=>[id,i+1]));
    const classes={
      item:options.itemClass||'toc-item',active:options.activeClass||'active',ancestor:options.ancestorClass||'ancestor',
      fold:options.foldClass||'fold-mini',placeholder:options.placeholderClass||'placeholder',
      number:options.numberClass||'num',label:options.labelClass||'label'
    };
    Tree.walkVisible(session.root,(node,parent,depth)=>{
      const item=doc.createElement('div');item.dataset.id=node.id;
      item.className=classes.item+(node.id===active?' '+classes.active:ancestors.has(node.id)?' '+classes.ancestor:'');
      item.style.paddingLeft=(options.baseIndent??8)+depth*(options.indent??15)+'px';
      const hasChildren=(node.children||[]).length>0;
      if(options.foldFirst!==false){
        const fold=doc.createElement('button');fold.className=classes.fold+(hasChildren?'':' '+classes.placeholder);
        fold.textContent=hasChildren?(node.collapsed?(options.expandGlyph||'＋'):(options.collapseGlyph||'−')):(options.leafGlyph||'·');
        if(!hasChildren&&options.hideLeafFold!==false)fold.style.visibility='hidden';
        if(hasChildren)fold.onclick=event=>{event.stopPropagation();options.onFold?.(node,event,item)};
        item.appendChild(fold);
      }
      const number=doc.createElement(options.numberTag||'span');number.className=classes.number;number.textContent=rank.get(node.id)||'';item.appendChild(number);
      const label=doc.createElement(options.labelTag||'span');label.className=classes.label;label.textContent=node.title||'未命名';item.appendChild(label);
      if(options.foldFirst===false&&hasChildren){
        const fold=doc.createElement('button');fold.className=classes.fold;fold.textContent=node.collapsed?(options.expandGlyph||'＋'):(options.collapseGlyph||'−');
        fold.onclick=event=>{event.stopPropagation();options.onFold?.(node,event,item)};item.appendChild(fold);
      }
      item.onclick=event=>{if(event.target.closest?.('.'+classes.fold))return;options.onGoto?.(node,event,item)};
      options.decorateItem?.(item,node,depth,rank.get(node.id)||0);
      container.appendChild(item);
    });
    return {active,count:session.order.length};
  },
  updateHighlight(container,session,options={}){
    if(!container||!session)return;
    const active=session.currentId(),ancestors=session.ancestors(),itemClass=options.itemClass||'toc-item',activeClass=options.activeClass||'active',ancestorClass=options.ancestorClass||'ancestor';
    container.querySelectorAll('.'+itemClass).forEach(el=>{
      el.classList.toggle(activeClass,el.dataset.id===active);
      el.classList.toggle(ancestorClass,el.dataset.id!==active&&ancestors.has(el.dataset.id));
    });
  }
};

export const PresentationView={
  defaults:Object.freeze({
    width:1600,height:900,stagePadding:20,tocBaseIndent:8,tocIndent:15,
    expandGlyph:'＋',collapseGlyph:'−',wheelThreshold:12,wheelThrottle:420,swipeAxisRatio:1.3
  }),
  create(options={}){
    const doc=options.document||global.document,win=options.window||global;
    const data=options.data,session=options.session;
    if(!doc||!win||!data||!session)throw new Error('PresentationView requires document, window, data and session');
    const resolve=value=>typeof value==='function'?value():value;
    const cfg={...PresentationView.defaults,...(options.config||{})};
    let bound=false,touchStart=null,wheelLocked=false;
    const listeners=[];
    const on=(target,type,handler,listenerOptions)=>{if(!target?.addEventListener)return;target.addEventListener(type,handler,listenerOptions);listeners.push(()=>target.removeEventListener(type,handler,listenerOptions))};
    const active=()=>options.isActive?!!options.isActive():true;
    const view={
      data,session,
      fit(){return Stage.apply(resolve(options.stage),resolve(options.stageWrap),{width:cfg.width,height:cfg.height,padding:cfg.stagePadding})},
      applySide(){
        const layout=resolve(options.tocLayout),toc=resolve(options.tocContainer),right=data.master?.tocSide==='right';
        if(layout&&options.rightClass)layout.classList.toggle(options.rightClass,right);
        if(toc&&options.tocRightClass)toc.classList.toggle(options.tocRightClass,right);
        if(layout&&toc&&options.moveToc){if(right)layout.appendChild(toc);else layout.insertBefore(toc,layout.firstChild)}
        return right;
      },
      applyTocVisibility(fit=true){
        const layout=resolve(options.tocLayout),button=resolve(options.tocToggle),show=session.actualTocVisible(win.innerWidth);
        if(layout)layout.classList.toggle(options.tocHiddenClass||'toc-hidden',!show);
        if(button){button.textContent=show?'×':'☰';button.title=show?'隐藏目录':'显示目录'}
        options.onTocVisibility?.(show,view);
        if(fit)win.requestAnimationFrame?.(()=>view.fit());
        return show;
      },
      toggleToc(){session.toggleToc(win.innerWidth);return view.applyTocVisibility()},
      renderToc(){
        const tree=resolve(options.tocTree);if(!tree)return null;
        const count=resolve(options.tocCount);
        if(count){const format=options.tocCountFormatter||((n)=>n+' 项');count.textContent=format(session.order.length)}
        return TocRenderer.render(tree,session,{
          document:doc,itemClass:options.itemClass||'toc-item',activeClass:options.activeClass||'active',ancestorClass:options.ancestorClass||'ancestor',
          foldClass:options.foldClass||'fold-mini',placeholderClass:options.placeholderClass||'placeholder',numberClass:options.numberClass||'num',labelClass:options.labelClass||'label',
          foldFirst:false,baseIndent:cfg.tocBaseIndent,indent:cfg.tocIndent,expandGlyph:cfg.expandGlyph,collapseGlyph:cfg.collapseGlyph,
          onFold:node=>{session.toggleCollapsed(node.id);options.onFold?.(node,view);view.render({rebuild:false})},
          onGoto:node=>{session.goto(node.id);options.onGoto?.(node,view);view.render({rebuild:false})},
          decorateItem:options.decorateTocItem
        });
      },
      updateHighlight(){
        const tree=resolve(options.tocTree);if(!tree)return;
        TocRenderer.updateHighlight(tree,session,{itemClass:options.itemClass||'toc-item',activeClass:options.activeClass||'active',ancestorClass:options.ancestorClass||'ancestor'});
      },
      render(renderOptions={}){
        if(renderOptions.rebuild!==false)session.rebuild(session.currentId(),session.index);
        const stage=resolve(options.stage);if(!stage)return null;
        Slide.render(stage,data,session.currentNode()||data,{
          elementOptions:{baseClass:options.elementClass||'present-el',animate:true,defaultAnimation:data.master?.defaultAnimation||'soft',...(options.elementOptions||{})},
          decorate:options.decorateSlideElement
        });
        view.applySide();view.renderToc();view.applyTocVisibility(false);view.updateHighlight();view.fit();
        if(options.scrollActive){const tree=resolve(options.tocTree);tree?.querySelector?.('.'+(options.itemClass||'toc-item')+'.'+(options.activeClass||'active'))?.scrollIntoView?.({behavior:'smooth',block:'center'})}
        options.afterRender?.(session.currentNode()||data,view);
        return stage;
      },
      refresh(preferredId=session.currentId(),fallback=session.index){session.rebuild(preferredId,fallback);return view.render({rebuild:false})},
      step(delta,wrap=true){session.step(delta,wrap);return view.render({rebuild:false})},
      action(action){
        if(['next','prev','first','last'].includes(action)){session.action(action);view.render({rebuild:false});return true}
        if(action==='toc'){view.toggleToc();return true}
        if(action==='fullscreen'){Fullscreen.toggle(resolve(options.fullscreenTarget)||doc.documentElement,doc);return true}
        if(action==='exit'){
          if(options.onExit)options.onExit(view);
          else if(Fullscreen.isActive(doc))Fullscreen.exit(doc);
          return true;
        }
        return false;
      },
      handleKey(event){
        if(!active())return false;
        const action=Input.presentationKeyAction(event);if(!action)return false;
        event.preventDefault?.();return view.action(action);
      },
      bindInput(){
        if(bound)return view;bound=true;
        const touchTarget=resolve(options.touchTarget)||resolve(options.stageWrap),exclude=options.excludeSelector||'.toc,#toc,video,input,textarea,select,[contenteditable="true"]';
        on(touchTarget,'touchstart',event=>{
          if(!active()||event.touches?.length!==1||event.target?.closest?.(exclude))return;
          const t=event.touches[0];touchStart={x:t.clientX,y:t.clientY,time:Date.now()};
        },{passive:true});
        on(touchTarget,'touchend',event=>{
          if(!active()||!touchStart||!event.changedTouches?.length)return;
          const t=event.changedTouches[0],step=Input.swipeStep(touchStart,{x:t.clientX,y:t.clientY,time:Date.now()},{axisRatio:cfg.swipeAxisRatio});touchStart=null;
          if(step)view.step(step);
        },{passive:true});
        on(win,'wheel',event=>{
          if(!active()||event.target?.closest?.(exclude))return;
          const step=Input.wheelStep(event,cfg.wheelThreshold);if(!step)return;
          event.preventDefault?.();if(wheelLocked)return;wheelLocked=true;view.step(step);win.setTimeout(()=>wheelLocked=false,cfg.wheelThrottle);
        },{passive:false});
        on(win,'resize',()=>{if(!active())return;if(session.tocOverride===null)view.applyTocVisibility();else view.fit()});
        return view;
      },
      destroy(){listeners.splice(0).forEach(off=>off());bound=false;touchStart=null;wheelLocked=false}
    };
    return view;
  }
};

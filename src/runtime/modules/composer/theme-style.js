const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const scaled=(value,scale,min=1,max=999)=>Math.round(clamp((Number(value)||0)*(Number(scale)||1),min,max)*100)/100;
const numericText=value=>/[-+]?\d+(?:\.\d+)?\s*(?:%|倍|万|亿|k|K|m|M|x|X)?/.test(String(value||''));
const isLineLike=element=>element?.type==='shape'&&element.shape!=='circle'&&((Number(element.h)||0)<=12||(Number(element.w)||0)<=24);
const isCardLike=element=>element?.type==='shape'&&element.shape!=='circle'&&!isLineLike(element)&&(Number(element.w)||0)>=160&&(Number(element.h)||0)>=54;
const isTitle=element=>element?.type==='text'&&((Number(element.fontSize)||0)>=44||((Number(element.y)||0)<270&&(Number(element.fontWeight)||0)>=720));
const isSubtitle=(element,theme)=>element?.type==='text'&&!isTitle(element)&&(element.color===theme.muted||(Number(element.fontSize)||0)<=30);

export function applyThemeVisualLanguage(elements=[],theme={}){
  const t=theme||{},typography=t.typography||{},spacing=t.spacing||{},title=t.titleTreatment||{},subtitle=t.subtitleTreatment||{},number=t.numberTreatment||{},card=t.cardTreatment||{},image=t.imageTreatment||{},decoration=t.decoration||{};
  for(const element of elements){
    if(element.type==='text'){
      const numberLike=numericText(element.text)&&(Number(element.fontSize)||0)>=30,titleLike=isTitle(element),subtitleLike=isSubtitle(element,t);
      element.fontFamily=numberLike?(number.fontFamily||typography.monoFontFamily):titleLike?(typography.displayFontFamily||typography.fontFamily):typography.fontFamily;
      if(titleLike){element.fontSize=scaled(element.fontSize,(typography.titleScale||1)*(title.scale||1),12,180);element.fontWeight=title.weight??typography.titleWeight??element.fontWeight;element.letterSpacing=title.letterSpacing??typography.letterSpacing??0}
      else if(subtitleLike){element.fontSize=scaled(element.fontSize,(typography.bodyScale||1)*(subtitle.scale||1),10,120);element.fontWeight=subtitle.weight??element.fontWeight;element.opacity=subtitle.opacity??1;element.letterSpacing=typography.letterSpacing??0}
      else{element.fontSize=scaled(element.fontSize,typography.bodyScale||1,10,120);element.fontWeight=element.fontWeight??typography.bodyWeight;element.letterSpacing=typography.letterSpacing??0}
      element.lineHeight=Math.round((Number(typography.lineHeight)||1.18)*(Number(spacing.rhythm)||1)*100)/100;
      if(numberLike){element.fontSize=scaled(element.fontSize,number.scale||1,10,190);element.fontWeight=number.weight??element.fontWeight;element.letterSpacing=number.letterSpacing??element.letterSpacing;if(number.colorMode==='accent')element.color=t.accent;else if(number.colorMode==='text')element.color=t.text}
      continue;
    }
    if(element.type==='image'||element.type==='video'){
      element.fit=image.fit||element.fit||'cover';element.radius=image.radius??t.radius?.image??0;element.borderWidth=image.borderWidth??t.border?.imageWidth??0;element.borderColor=element.borderColor||t.line||'transparent';element.shadow=image.shadow??t.shadow?.image??'none';continue;
    }
    if(element.type!=='shape')continue;
    if(isLineLike(element)){
      if((Number(element.h)||0)<=(Number(element.w)||0)){element.h=scaled(element.h,decoration.lineScale||1,1,30)}else element.w=scaled(element.w,decoration.lineScale||1,1,30);
      element.radius=decoration.accentRadius??t.radius?.accent??element.radius;element.opacity=decoration.accentOpacity??1;continue;
    }
    if(element.shape==='circle'){element.opacity=element.fill===t.accent?(decoration.accentOpacity??1):element.opacity;continue}
    if(isCardLike(element)){
      element.radius=card.radius??t.radius?.card??element.radius;
      if(element.fill!==t.accent){element.borderWidth=card.borderWidth??t.border?.cardWidth??element.borderWidth;element.shadow=card.shadow??t.shadow?.card??'none'}
    }
  }
  return elements;
}

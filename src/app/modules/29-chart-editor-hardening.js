

  // Keep invalid intermediate chart states out of Project data.
  // Example: switching a two-point chart to radar is rejected without mutating the element.
  chartCommitV10=function chartCommitValidatedV10(e,dataValue,{rerender=true,refreshPanel=false}={}){
    const normalized=Core.NativeChart.normalize(dataValue||{}),check=Core.NativeChart.validate(normalized);
    if(!check.ok){
      toast('图表数据无效：'+(check.errors[0]?.message||'请检查数据'));
      if(refreshPanel)showChartPropertyPanelV10(e.id);
      return false;
    }
    chartAssignNormalizedV10(e,normalized);
    chartSyncComposerContentV10(e);
    save();
    if(rerender)chartRenderElementV10(e);
    if(refreshPanel)showChartPropertyPanelV10(e.id);
    return true;
  };

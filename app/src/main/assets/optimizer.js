'use strict';
importScripts('skew.js','strategy.js','rough.js','search.js');
onmessage=e=>{try{
 const {grid,costs}=e.data,rows=e.data.rows||Array.from({length:e.data.packed.length/5},(_,i)=>{const p=e.data.packed,k=i*5;return {t:p[k],o:p[k+1],h:p[k+2],l:p[k+3],c:p[k+4]};});Rough.validateRows(rows);
 const c=Rough.costs(costs),domain=Search.domain(grid,c),plan=Search.planner(domain,e.data.search),n=rows.length,a=Math.floor(n*.6),b=Math.floor(n*.8);
 if(a<100||n-b<80)throw Error('Use at least 400 samples for chronological 60/20/20 splits');
 let rejected=0,ineligible=0,best=null,leaders=[],cachedWindow='',cachedFeatures=null,cachedParams='',cachedSignals=null;
 const started=Date.now(),trials=[],families=new Map();let lastProgress=0;
 const strip=x=>{const {curve,...metrics}=x;return metrics;};
 for(let k=0;k<plan.settings.budget;k++){
  const proposal=plan.next(k,best),{params:p,risk,strategy}=domain.at(proposal.coords),candidateCosts=Rough.costs({...c,...risk}),featureKey=p.window+':'+candidateCosts.gapMs;
  if(cachedWindow!==featureKey){cachedWindow=featureKey;cachedFeatures=Rough.features(rows,p.window,candidateCosts.gapMs);cachedParams='';}
  const key=JSON.stringify(p);if(key!==cachedParams){cachedParams=key;cachedSignals=Rough.indicator(rows,p,candidateCosts.gapMs,cachedFeatures).signals;}
  const train=Rough.backtest(rows,p,candidateCosts,{from:0,to:a},cachedFeatures,cachedSignals,strategy),validation=Rough.backtest(rows,p,candidateCosts,{from:a,to:b},cachedFeatures,cachedSignals,strategy),score=Math.min(train.score,validation.score),invalid=train.invalid||validation.invalid||!Number.isFinite(score),eligible=!invalid&&score>-1e9;
  const family=strategy?TradeStrategy.label(strategy)+' · '+(strategy.sizing?'cash sizing':'equity sizing'):'Legacy signal / flat exit',summary=families.get(family)||{label:family,tried:0,eligible:0,rejected:0,bestScore:null,bestTrain:null,bestValidation:null,sumValidation:0};summary.tried++;
  if(invalid){rejected++;summary.rejected++;plan.observe(proposal,-1e9);}else{
   if(!eligible)ineligible++;else{summary.eligible++;summary.sumValidation+=validation.roi;}
   if(summary.bestScore===null||score>summary.bestScore){summary.bestScore=score;summary.bestTrain=train.roi;summary.bestValidation=validation.roi;}
   const candidate={params:p,risk,strategy,score,train,validation,coords:proposal.coords,method:proposal.phase};plan.observe(proposal,score);leaders.push(candidate);leaders.sort((x,y)=>y.score-x.score);leaders=leaders.slice(0,10);if(!best||score>best.score)best=candidate;
  }
  families.set(family,summary);
  // A bounded audit tail keeps million-candidate runs from exhausting a mobile WebView.
  trials[k%2000]={number:k+1,coords:proposal.coords,method:proposal.phase,score:invalid?null:score,status:invalid?'overflow':eligible?'eligible':'too few trades',train:strip(train),validation:strip(validation)};
  const now=Date.now();if(plan.settings.budget<=512||now-lastProgress>=250||k+1===plan.settings.budget){lastProgress=now;postMessage({kind:'progress',done:k+1,total:plan.settings.budget,space:domain.total.toString(),method:proposal.phase,elapsedMs:now-started,best:best?{params:best.params,risk:best.risk,strategy:best.strategy,score:best.score,train:best.train.roi,validation:best.validation.roi}:null,rejected,ineligible,latest:trials[k%2000],families:[...families.values()]});}
 }
 if(!best)throw Error('All candidates exceeded numerical simulation limits; reduce risk ranges');
 const selectedCosts=Rough.costs({...c,...best.risk}),holdout=Rough.backtest(rows,best.params,selectedCosts,{from:b,to:n},undefined,undefined,best.strategy);
 postMessage({kind:'result',best,holdout,leaders,trials:trials.sort((x,y)=>x.number-y.number),families:[...families.values()],samples:n,split:{train:[rows[0].t,rows[a-1].t],validation:[rows[a].t,rows[b-1].t],holdout:[rows[b].t,rows[n-1].t]},baseCosts:c,costs:selectedCosts,search:{...plan.settings,...plan.stats(),rejected,ineligible,space:domain.total.toString(),complete:BigInt(plan.settings.budget)===domain.total,elapsedMs:Date.now()-started,grid,trialLimit:2000},at:Date.now(),engineVersion:'1.6.0',simulatorVersion:'1.9.0',eligible:best.score>-1e9});
}catch(e){postMessage({kind:'error',message:e.message});}};

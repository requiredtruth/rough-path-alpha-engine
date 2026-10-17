/* Release diagnostics: retry transient REST failures without accepting stale data. */
const M=require('../app/src/main/assets/market-data.js');
module.exports=async function freshBtc(router,base,registry,{maxAttempts=12,waitMs=1000,budgetMs=30000}={}){
 const deadline=Date.now()+budgetMs;let last=Error('No BTC response');
 for(let attempt=0;attempt<maxAttempts&&Date.now()<deadline;attempt++){
  try{
   const timeout=Math.max(100,Math.min(5000,Math.floor((deadline-Date.now())/2))),raw=await router.json(base+'/prices',timeout),received=Date.now();let frames=[];try{frames=M.apiFrames(raw,registry,received);}catch{}const btc=frames.find(f=>f.m[0]===registry.get('BTC/USD'));
   if(btc)return {btc,frames};
   const row=raw?.data?.find?.(r=>r.market==='BTC/USD');last=Error('BTC reference rejected by unchanged freshness checks: source '+(row?.updatedAt??'missing')+' / received '+received);
  }catch(e){last=e;}
  const wait=Math.min(waitMs,deadline-Date.now());if(wait>0&&attempt+1<maxAttempts)await new Promise(r=>setTimeout(r,wait));
 }
 throw last;
};

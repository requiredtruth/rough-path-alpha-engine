const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const R=require('../app/src/main/assets/rough.js'),T=require('../app/src/main/assets/strategy.js');global.Rough=R;const S=require('../app/src/main/assets/search.js');
const rows=Array.from({length:1000},(_,i)=>({t:1600000000000+i*60000,o:100,h:100,l:100,c:100})),costs=R.costs({balance:1000,leverage:1,allocation:10,fee:0,slip:0,borrow:0,funding:0}),sig=Int8Array.from(rows,(_,i)=>[1,1,0,1,-1,-1,0,-1,1][i]||0);
const run=(s={},r=rows,signals=sig,c=costs,range={from:0,to:10})=>R.backtest(r,R.defaults,c,range,undefined,signals,{tradeMode:2,...s});
let x=run({add:1});assert.equal(x.entries,5);assert.equal(x.maxOpen,5);assert.equal(x.trades,5);assert.equal(x.balance,1000);
x=run({add:0});assert.equal(x.entries,2);assert.equal(x.maxOpen,2);
x=run({tradeMode:1,add:1});assert.equal(x.entries,5);assert.equal(x.maxOpen,2);assert.equal(x.switchExits,4);
x=run({tradeMode:1,add:0});assert.equal(x.entries,3);assert.equal(x.maxOpen,1);
x=run({tradeMode:5});assert.equal(x.entries,2);assert.equal(x.switchExits,2);assert.equal(x.maxOpen,1);
x=run({tradeMode:3,add:1});assert.equal(x.switchExits,0,'Zero net profit does not qualify for profit-only reversal');assert.equal(x.maxOpen,5);
x=run({tradeMode:4,add:1});assert.equal(x.entries,3);assert.equal(x.maxOpen,3);assert.equal(x.switchExits,0,'Hold ignores opposite arrows rather than hedging');
assert.equal(run({direction:1,add:1}).entries,3);assert.equal(run({direction:-1,add:1}).entries,2);
x=run({add:1,maxPositions:2});assert.equal(x.entries,2);assert.equal(x.skipped,3);
const alternating=Int8Array.from(rows,(_,i)=>i%2?1:-1);x=run({add:1},rows,alternating,costs,{from:0,to:20});assert.equal(x.entries,10);assert.equal(x.maxOpen,10);assert.equal(x.skipped,9,'Full equity allocations stop when cash runs out');assert.equal(x.balance,1000);
x=run({add:1,sizing:1},rows,alternating,costs,{from:0,to:20});assert.equal(x.entries,19);assert.equal(x.maxOpen,19,'Cash sizing uses progressively smaller allocations');
const rising=rows.map((r,i)=>{const p=[100,100,102,104,106,108,105,104][i]??104;return {...r,o:p,h:p,l:p,c:p};}),one=Int8Array.from(rows,()=>1);
x=run({exitType:1,atrPeriod:2,atrMult:1},rising,one,costs,{from:0,to:10});assert.equal(x.profitExits,1);assert(x.roi>0);
x=run({exitType:1,atrPeriod:2,atrMult:1,minProfit:100},rising,one,costs,{from:0,to:10});assert.equal(x.profitExits,0);
x=run({exitType:2,takeProfit:5,stopLoss:50},rising,one,costs,{from:0,to:10});assert.equal(x.profitExits,1);assert(Math.abs(x.roi-.6)<1e-8);
const crash=rows.map((r,i)=>i===2?{...r,o:100,h:100,l:80,c:90}:r);x=run({exitType:2,stopLoss:5},crash,one,costs,{from:0,to:10});assert.equal(x.profitExits,0);assert(Math.abs(x.roi+.5)<1e-8);
x=run({exitType:0},crash,one,{...costs,leverage:10},{from:0,to:10});assert.equal(x.liquidations,1);assert(x.balance>=0);
const gap=rows.map((r,i)=>({...r,t:r.t+(i>=4?600000:0)}));x=run({},gap,one,costs,{from:0,to:10});assert.equal(x.gaps,1);assert.equal(x.maxOpen,1);
for(const bad of [{tradeMode:6},{add:2},{atrPeriod:2.5},{maxPositions:0},{takeProfit:0}])assert.throws(()=>T.options(bad));
const d=S.domain({tradeMode:'0:5:1',add:'0,1',direction:'-1,0,1',exitType:'0:3:1',fee:'0,0.035',atrMult:'1,3'});assert.equal(d.total,576n);assert(d.keys.includes('gapMs'));assert.equal(d.at(d.decode(575n)).strategy.tradeMode,5);
// Full worker evaluates all models without looking at the holdout during selection.
const assets=path.resolve('app/src/main/assets');function optimize(data,grid={},budget=48){let result;const ctx=vm.createContext({postMessage:m=>{if(m.kind==='result'||m.kind==='error')result=m;},importScripts:(...ns)=>ns.forEach(n=>vm.runInContext(fs.readFileSync(path.join(assets,n),'utf8'),ctx))});vm.runInContext(fs.readFileSync(path.join(assets,'optimizer.js'),'utf8'),ctx);ctx.onmessage({data:{rows:data,grid:{window:[8],bandWindow:[8],projectionWindow:[4],tradeMode:'0:5:1',add:'0,1',exitType:'0:3:1',leverage:[5],allocation:[10],...grid},costs,search:{mode:'grid',budget,seed:42}}});assert.equal(result.kind,'result',result.message);return JSON.parse(JSON.stringify(result));}
const waves=rows.map((r,i)=>{const p=100+5*Math.sin(i/10);return {...r,o:p,h:p+.1,l:p-.1,c:p};}),a=optimize(waves),b=optimize(waves.map((r,i)=>i<800?r:{...r,o:r.o*2,h:r.h*2,l:r.l*2,c:r.c*2}));assert.deepEqual(a.best,b.best);assert.equal(a.search.unique,48);assert.equal(a.families.reduce((n,x)=>n+x.tried,0),48);assert.equal(a.trials.length,48);assert(a.trials.every(x=>x.coords&&x.status&&x.validation));assert.equal(a.simulatorVersion,'1.9.0');assert(a.best.strategy);assert(a.search.complete);
console.log('PASS strategy modes, arrow-only adds, hedge, direction filters, cash limits, net profit Chandelier, TP/SL, liquidation, gaps, full model search audit and untouched holdout');

const tail=optimize(waves.slice(0,400),{tradeMode:[2],add:[0],exitType:[0],leverage:'1:500:0.1'},2001);assert.equal(tail.search.unique,2001);assert.equal(tail.trials.length,2000);assert.equal(tail.trials[0].number,2);assert.equal(tail.trials[1999].number,2001);assert.equal(tail.families.reduce((n,x)=>n+x.tried,0),2001);console.log('PASS bounded audit tail and complete family counts beyond 2,000 evaluations');

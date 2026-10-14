const assert=require('node:assert/strict'),R=require('../app/src/main/assets/rough.js'),H=require('../app/src/main/assets/history.js'),T=require('../app/src/main/assets/ticks.js');
const approx=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const s=R.signature([[0,0],[1,2],[3,3]]);approx(s.s1[0],3);approx(s.s1[1],3);approx(s.s2[0][1]+s.s2[1][0],9);
const ll=R.leadLag([1,2,4,3]);approx(Math.abs(ll.area),3);
const rows=Array.from({length:700},(_,i)=>{const p=100+Math.sin(i/25)*3+i*.02;return {t:1600000000000+i*60000,o:p,h:p+.1,l:p-.1,c:p,v:1};});R.validateRows(rows);
const f=R.features(rows,32);for(let i=32;i<rows.length;i+=73){const a=rows.slice(i-32,i+1),p0=Math.log(a[0].c),dt=a.at(-1).t-a[0].t,direct=R.signature(a.map(x=>[(x.t-a[0].t)/dt,Math.log(x.c)-p0]));approx(f.area[i],direct.area/(Math.sqrt(f.qv[i])+1e-12));}
const prefix=R.indicator(rows.slice(0,300)),full=R.indicator(rows);for(let i=0;i<300;i++){assert.equal(prefix.filtered[i],full.filtered[i]);assert.equal(prefix.signals[i],full.signals[i]);}
const coarse=R.backtest(rows,R.defaults,{fee:.1,borrow:.01});assert(coarse.trades>0);assert(coarse.fees>0);assert(coarse.drawdown>=0);assert(Number.isFinite(coarse.score));assert.deepEqual(coarse,R.backtest(rows,R.defaults,{fee:.1,borrow:.01}));
const clean=R.backtest(rows,R.defaults,{fee:0,slip:0,borrow:0});assert(clean.balance>coarse.balance);
const noisy=Array.from({length:700},(_,i)=>({t:1600000000000+i*60000,o:100,h:100,l:100,c:100,v:1}));assert.equal(R.backtest(noisy,R.defaults).trades,0);
const invalid=[...rows];invalid[1]={...invalid[0]};assert.throws(()=>R.validateRows(invalid));assert.throws(()=>R.grid({window:[2]}));assert.throws(()=>R.costs({leverage:501}));assert.equal(R.costs({leverage:1}).leverage,1);
assert.notDeepEqual(R.indicator(rows,{smooth:.05}).scores,R.indicator(rows,{smooth:.8}).scores);
const gap=rows.map((r,i)=>({...r,t:r.t+(i>=350?3600000:0)}));const gf=R.features(gap,32);assert.equal(gf.valid[350],0);assert.equal(gf.valid[381],0);assert.equal(gf.valid[382],1);assert(R.backtest(gap,R.defaults).gaps>0);
const year=H.validateRequest({coins:['BTC'],from:Date.UTC(2024,0,1),to:Date.UTC(2025,0,1),granularity:60});assert.equal(H.plan(year).length,2636);assert(H.plan(year).every(x=>(x.to-x.from)/60000<=200));
const page=H.normalize([[1700000040,99,102,100,101,2],[1700000040,99,102,100,101,2],[1700000100,105,90,100,101,2]],'coinbase',1700000000000,1700000200000);assert.equal(page.length,1);assert.equal(page[0].o,100);
assert.equal(T.normalize([{trade_id:1,time:'2024-01-01T00:00:01Z',price:'100',size:'1'},{trade_id:1,time:'2024-01-01T00:00:01Z',price:'100',size:'1'}],Date.UTC(2024,0,1),Date.UTC(2024,0,2)).length,1);
console.log('PASS: exact signature identities, lead-lag variation, prefix area, causality, smoothing, costs, deterministic backtest, gaps, 1–500 leverage, year pagination and data normalization.');

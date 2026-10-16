const assert=require('node:assert/strict'),M=require('../app/src/main/assets/market-data.js');
const now=Date.now(),map=M.registry({data:[{symbol:'ETH/USD',pairIndex:1},{symbol:'BTC/USD',pairIndex:0}]});
const row={market:'BTC/USD',mark:'103',index:'101',updatedAt:now};
assert.deepEqual(M.apiFrames({data:[row]},map,now),[{t:now,m:[0,103],i:[0,101]}]);
assert.equal(M.apiFrames({data:[{...row,market:'UNKNOWN/USD'}, {...row,updatedAt:now-5000},{...row,updatedAt:now+2001},row]},map,now).length,1);
for(const r of [{...row,mark:null},{...row,index:''},{...row,mark:'Infinity'},{...row,updatedAt:null}])assert.throws(()=>M.apiFrames({data:[r]},map,now));
assert.throws(()=>M.registry({data:[{symbol:'BTC/USD',pairIndex:0},{symbol:'ETH/USD',pairIndex:0}]}));
assert.throws(()=>M.rates({fundingFeeLongHourlyRate:0},now));assert.throws(()=>M.rates({timestamp:(now-180000)/1000,fundingFeeLongHourlyRate:0},now));
const rates=M.apiRates({market:'BTC/USD',fundingRateLongHourly:'-0.00001',fundingRateShortHourly:'0.00002',borrowingRateHourly:'0.00000228'},'BTC/USD');assert.equal(rates.long,-.00001);assert.throws(()=>M.apiRates({market:'ETH/USD'},'BTC/USD'));
// Real facade lifecycle: subscribe each connection, answer application heartbeat,
// fail over .trade -> .dev, then promote recovered primary without a feed gap.
global.MarketData=M;const {Router,socket}=require('../app/src/main/assets/routing.js');
let time=now,timers=[],watch,all=[];class WS{constructor(url){this.url=url;this.sent=[];all.push(this);}send(s){this.sent.push(JSON.parse(s));}close(){this.onclose?.({code:1006});}}
const router=new Router({clock:()=>time}),feed=socket('wss://api.gains.trade/v1/arbitrum/ws',router,WS,{now:()=>time,setTimeout:f=>(timers.push(f),f),clearTimeout:f=>timers=timers.filter(x=>x!==f),setInterval:f=>(watch=f,f),clearInterval:()=>{}});let count=0;feed.onmessage=()=>count++;
let a=all[0];a.onopen({});assert.deepEqual(a.sent[0],{op:'subscribe',channel:'prices'});a.onmessage({data:JSON.stringify({op:'ping'})});assert.equal(a.sent[1].op,'pong');assert.equal(count,0);a.close();timers.pop()();let b=all.at(-1);assert(b.url.includes('.dev'));b.onopen({});b.onmessage({data:JSON.stringify({channel:'prices',data:[row]})});assert.equal(count,1);time+=60001;b.onmessage({data:JSON.stringify({channel:"prices",data:[row]})});watch();let p=all.at(-1);assert(p.url.includes('.trade'));p.onopen({});p.onmessage({data:JSON.stringify({channel:'prices',data:[row]})});assert.equal(count,3);assert(feed.url.includes('.trade'));feed.close();
console.log('PASS: registered Arbitrum API prices, independent mark/index, per-row stale rejection, funding freshness and subscribed WebSocket failover/recovery.');
// Node's real WebSocket can synchronously emit another error when a failed
// connecting socket is closed. The adapter must not recursively close it.
{let queued=[],closes=0;class Reentrant{static all=[];constructor(u){this.url=u;Reentrant.all.push(this);}close(){closes++;if(closes>3)throw Error('recursive close');this.onerror?.({});this.onclose?.({code:1006});}}
const r=new Router(),s=socket('wss://api.gains.trade/v1/arbitrum/ws',r,Reentrant,{setTimeout:f=>(queued.push(f),f),clearTimeout:f=>queued=queued.filter(x=>x!==f),setInterval:()=>1,clearInterval:()=>{}});Reentrant.all[0].onerror({});assert.equal(closes,1);queued.pop()();assert(Reentrant.all.at(-1).url.includes('.dev'));s.close();}

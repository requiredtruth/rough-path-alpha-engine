const assert=require('node:assert/strict'),fresh=require('../tools/fresh-btc-reference.cjs');
const registry=new Map([['BTC/USD',0]]),raw=offset=>({data:[{market:'BTC/USD',mark:'100',index:'101',updatedAt:Date.now()+offset}]}),settings={maxAttempts:3,waitMs:0,budgetMs:1000};
(async()=>{
 let calls=0;const r=await fresh({json:async()=>{calls++;return raw(calls<3?-10000:0);}},'https://api.gains.trade/v1/arbitrum',registry,settings);assert.equal(calls,3);assert.equal(r.btc.m[1],100);
 calls=0;await fresh({json:async()=>{if(++calls===1)throw Error('HTTP 502');return raw(0);}},'https://api.gains.trade/v1/arbitrum',registry,settings);assert.equal(calls,2);
 await assert.rejects(()=>fresh({json:async()=>raw(-10000)},'https://api.gains.trade/v1/arbitrum',registry,settings),/freshness/);
 await assert.rejects(()=>fresh({json:async()=>raw(10000)},'https://api.gains.trade/v1/arbitrum',registry,settings),/freshness/);
 console.log('PASS bounded provider retries, fresh recovery, HTTP recovery, unchanged stale/future timestamp rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});

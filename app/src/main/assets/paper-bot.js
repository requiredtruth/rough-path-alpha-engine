/* Confirmed chart arrows -> paper ledger only. Never signs or sends an order. */
(function(root){
'use strict';
const LEVERAGE=500,ALLOCATION=10;
function isArrow(current,previous){return !!(current?.ready&&previous&&current.signal&&current.signal!==previous.signal);}
function equity(book,quote,now=Date.now()){
 let total=book.cash;
 for(const p of book.positions){const q=quote(p.pair);if(!root.Engine.freshQuote(q.price,q.at,now))throw Error('Waiting for fresh prices for all paper positions');total+=root.Engine.settle(p,q.price,now).payout;}
 return Math.max(0,total);
}
function trade(book,market,long,quote,cost,now=Date.now()){
 const q=quote(market);if(!root.Engine.freshQuote(q.price,q.at,now))throw Error('Waiting for fresh execution price');
 // Validate the entire book before closing anything; no stale equity sizing.
 equity(book,quote,now);root.Engine.validateCosts(cost);
 for(const p of [...book.positions])if(p.bot==='arrow'&&p.pair===market&&p.long!==long){const s=root.Engine.settle(p,q.price,now);book.cash+=s.payout;book.positions=book.positions.filter(x=>x.id!==p.id);book.history.unshift({...p,net:s.net,settlement:s,closed:now,exit:q.price,status:'Bot reversal'});}
 book.history=book.history.slice(0,200);
 const amount=Math.floor(equity(book,quote,now)*ALLOCATION/100*1e6)/1e6;
 if(!(amount>0))throw Error('No paper capital remaining');
 if(amount>book.cash)throw Error('Insufficient free paper cash for 10% of equity');
 const p=root.Engine.open(market,long,amount,LEVERAGE,q.price,cost,now);
 if(root.Engine.value(p,q.price,now).net<=-amount*cost.liq/100)throw Error('Entry costs would liquidate this position');
 p.bot='arrow';p.status='Paper bot open';book.cash-=amount;book.positions.push(p);return p;
}
class Cursor{
 constructor(now,interval){this.interval=interval;this.ms=interval*60000;this.after=Math.floor(now/this.ms)*this.ms-this.ms;}
 next(rows,series,now){
  // Only the most recently completed interval may trade. Backfills and resumes
  // cannot replay old arrows, and each candle is consumed even if orders fail.
  const latest=Math.floor(now/this.ms)*this.ms-this.ms;
  if(latest<=this.after)return null;
  const i=rows.findIndex(r=>r.t===latest);if(i<1)return null;
  this.after=latest;
  const p={ready:series.ready[i],signal:series.signals[i]},before={signal:series.signals[i-1]};
  return rows[i-1].t===latest-this.ms&&isArrow(p,before)?{long:p.signal>0,t:latest}:null;
 }
}
const api={LEVERAGE,ALLOCATION,isArrow,equity,trade,Cursor};root.PaperBot=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

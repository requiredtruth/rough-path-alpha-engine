/* Live chart arrow appearances -> paper ledger only. Never signs or sends an order. */
(function(root){
'use strict';
const LEVERAGE=500,ALLOCATION=10;
const defaults={allocation:10,leverage:500,hedge:true,chandelier:true,atrPeriod:14,atrMult:3,minProfit:0};
function options(raw={}){const o={...defaults,...raw};for(const [k,lo,hi] of [['allocation',.01,100],['leverage',1.1,1000],['atrPeriod',2,200],['atrMult',.1,20],['minProfit',0,10000]])if(!Number.isFinite(o[k])||o[k]<lo||o[k]>hi)throw Error('Invalid bot '+k);if(!Number.isInteger(o.atrPeriod)||typeof o.hedge!=='boolean'||typeof o.chandelier!=='boolean')throw Error('Invalid bot options');return o;}
function atr(rows,period,now=Date.now()){
 let prev=null,sum=0,count=0,value=NaN;
 for(const c of rows||[]){if(c.t+60000>now)continue;if(c.source==='gap-fill'||prev&&c.t!==prev.t+60000){prev=null;sum=0;count=0;value=NaN;if(c.source==='gap-fill')continue;}
 const tr=prev?Math.max(c.h-c.l,Math.abs(c.h-prev.c),Math.abs(c.l-prev.c)):c.h-c.l;
 if(count<period){sum+=tr;count++;if(count===period)value=sum/period;}else value=(value*(period-1)+tr)/period;prev=c;
 }return value;
}
function updateStop(p,price,range,now=Date.now()){
 if(p.bot!=='arrow'||!p.botOptions?.chandelier)return false;
 const o=p.botOptions;p.botHigh=Math.max(p.botHigh??price,price);p.botLow=Math.min(p.botLow??price,price);
 if(!(range>0&&Number.isFinite(range)))return false;
 const candidate=p.long?p.botHigh-range*o.atrMult:p.botLow+range*o.atrMult;
 if(!(candidate>0))return false;
 p.botStop=Number.isFinite(p.botStop)?(p.long?Math.max(p.botStop,candidate):Math.min(p.botStop,candidate)):candidate;
 const net=root.Engine.value(p,price,now).net,profitable=net>0&&net>=p.amount*o.minProfit/100;
 if(profitable)p.botArmed=true;
 return !!(p.botArmed&&profitable&&(p.long?price<=p.botStop:price>=p.botStop));
}
function exits(book,market,price,rows,now=Date.now()){
 const closed=[],ranges=new Map();
 for(const p of [...book.positions]){if(p.pair!==market||!p.botOptions?.chandelier)continue;const period=p.botOptions.atrPeriod;if(!ranges.has(period))ranges.set(period,atr(rows,period,now));if(updateStop(p,price,ranges.get(period),now)){const settlement=root.Engine.settle(p,price,now);book.cash+=settlement.payout;book.positions=book.positions.filter(x=>x.id!==p.id);const receipt={...p,net:settlement.net,settlement,exit:price,closed:now,status:'Chandelier profit'};book.history.unshift(receipt);closed.push(receipt);}}
 book.history=book.history.slice(0,200);return closed;
}
function isArrow(current,previous){return !!(current?.ready&&previous&&current.signal&&current.signal!==previous.signal);}
function equity(book,quote,now=Date.now()){
 let total=book.cash;
 for(const p of book.positions){const q=quote(p.pair);if(!root.Engine.freshQuote(q.price,q.at,now))throw Error('Waiting for fresh prices for all paper positions');total+=root.Engine.settle(p,q.price,now).payout;}
 return Math.max(0,total);
}
function trade(book,market,long,quote,cost,now=Date.now(),raw={hedge:false,chandelier:false}){
 const o=options(raw),q=quote(market);if(!root.Engine.freshQuote(q.price,q.at,now))throw Error('Waiting for fresh execution price');if(o.leverage>root.Engine.maxLevFor(market)||o.leverage<(root.TradeConfig?.marketOrNull(market)?.minLeverage??1.1)||Math.abs(o.leverage*1000-Math.round(o.leverage*1000))>1e-7)throw Error('Bot leverage unavailable for this market');
 // Validate the entire book before closing anything; no stale equity sizing.
 equity(book,quote,now);root.Engine.validateCosts(cost);
 for(const p of [...book.positions])if(!o.hedge&&p.bot==='arrow'&&p.pair===market&&p.long!==long){const s=root.Engine.settle(p,q.price,now);book.cash+=s.payout;book.positions=book.positions.filter(x=>x.id!==p.id);book.history.unshift({...p,net:s.net,settlement:s,closed:now,exit:q.price,status:'Bot reversal'});}
 book.history=book.history.slice(0,200);
 const amount=Math.floor(equity(book,quote,now)*o.allocation/100*1e6)/1e6;
 if(!(amount>0))throw Error('No paper capital remaining');
 if(amount>book.cash)throw Error('Insufficient free paper cash for '+o.allocation+'% of equity');
 const p=root.Engine.open(market,long,amount,o.leverage,q.price,cost,now);
 if(root.Engine.value(p,q.price,now).net<=-amount*cost.liq/100)throw Error('Entry costs would liquidate this position');
 p.bot='arrow';p.botOptions={...o};p.botHigh=q.price;p.botLow=q.price;p.status='Paper bot open';book.cash-=amount;book.positions.push(p);return p;
}
class Cursor{
 constructor(now,interval){this.interval=interval;this.ms=interval*60000;this.bucket=Math.floor(now/this.ms)*this.ms;this.seen=new Set();}
 next(rows,series,now){
  // Trade the forming interval as soon as its chart arrow exists. Each side is
  // consumed once per candle, even if it flickers, repaints or an order fails.
  const current=Math.floor(now/this.ms)*this.ms;if(current<this.bucket)return null;
  if(current>this.bucket){this.bucket=current;this.seen.clear();}
  const i=rows.findIndex(r=>r.t===current);if(i<1||rows[i-1].t!==current-this.ms)return null;
  const p={ready:series.ready[i],signal:series.signals[i]},before={signal:series.signals[i-1]};
  if(!isArrow(p,before)||this.seen.has(p.signal))return null;
  this.seen.add(p.signal);return {long:p.signal>0,t:current,provisional:true};
 }
}

const api={defaults,options,atr,updateStop,exits,LEVERAGE,ALLOCATION,isArrow,equity,trade,Cursor};root.PaperBot=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

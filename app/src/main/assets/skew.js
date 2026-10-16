/* Funding: decimal per hour; Coinbase side is maker side (sell = taker buy). */
(function(root){'use strict';
const clamp=v=>Math.max(0,Math.min(1,v));
function deform(center,width,s,at){const neutral={upper:center+width,lower:Math.max(1e-9,center-width),risk:0,active:false};if(!s||![s.t,s.oiLong,s.oiShort,s.longGrowth,s.spotDelta,s.spotVolume,s.funding,s.spotAt,s.oiAt,s.fundingAt].every(Number.isFinite)||s.t>at||at-s.t>120000||s.oiLong<0||s.oiShort<0||s.spotVolume<=0||s.oiLong+s.oiShort<=0||Math.abs(s.spotDelta)>s.spotVolume*1.000001||[s.spotAt,s.oiAt,s.fundingAt].some(t=>t>at||at-t>120000))return neutral;
 const weakness=clamp(-s.spotDelta/s.spotVolume),crowding=clamp((s.oiLong-s.oiShort)/(s.oiLong+s.oiShort)),growth=clamp(s.longGrowth/.02),funding=clamp(s.funding/.00001),risk=clamp(weakness*crowding*growth*(.5+.5*funding));return {upper:center+width*(1-.8*risk),lower:Math.max(1e-9,center-width*(1+.5*risk)),risk,active:true};}
class Book {
 constructor(){this.points=new Map();this.spot=new Map();this.oi=new Map();this.revision=0;}
 record(m,s){let a=this.points.get(m)||[];if(a.length&&s.t<a.at(-1).t)throw Error('Out-of-order observation');if(a.length&&s.t===a.at(-1).t)a[a.length-1]={...s};else a.push({...s});if(a.length>10080)a.splice(0,a.length-10080);this.points.set(m,a);this.revision++;}
 spotTrades(m,rows,now){let a=this.spot.get(m)||new Map();for(const r of rows){const t=Date.parse(r.time),v=Number(r.size)*Number(r.price);if(Number.isFinite(t)&&t<=now&&now-t<=120000&&Number.isFinite(v)&&v>0&&['buy','sell'].includes(r.side))a.set(String(r.trade_id),{t,v,d:r.side==='sell'?v:-v});}for(const [id,r]of a)if(now-r.t>120000)a.delete(id);while(a.size>10000)a.delete(a.keys().next().value);this.spot.set(m,a);}
 observeOI(m,long,short,now){if(![long,short,now].every(Number.isFinite)||long<0||short<0)return;let a=this.oi.get(m)||[];if(a.length&&now<=a.at(-1).t)return;a.push({t:now,long,short});while(a.length>1&&now-a[0].t>300000)a.shift();this.oi.set(m,a);}
 capture(m,funding,fundingAt,now){const a=this.oi.get(m)||[],oi=a.at(-1),base=a.find(x=>x.t<=now-60000),spot=[...(this.spot.get(m)?.values()||[])].filter(x=>now-x.t<=120000);if(!oi||!base||!spot.length)return;this.record(m,{t:now,oiLong:oi.long,oiShort:oi.short,longGrowth:(oi.long-base.long)/Math.max(base.long,1),spotDelta:spot.reduce((s,x)=>s+x.d,0),spotVolume:spot.reduce((s,x)=>s+x.v,0),spotAt:Math.max(...spot.map(x=>x.t)),oiAt:oi.t,funding,fundingAt});}
}
const api={deform,Book};root.RoughSkew=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

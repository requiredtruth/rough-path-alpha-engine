/* Causal multi-position research simulator; OHLC cannot replay intrabar arrow repainting. */
(function(root){'use strict';
const modes=['Signal / flat exit','Close on switch + reverse','Hedge both directions','Close profitable opposite + hedge','Hold until risk exit','Close on switch, no reverse'];
const defaults={tradeMode:0,add:0,direction:0,exitType:0,atrPeriod:14,atrMult:3,minProfit:0,takeProfit:100,stopLoss:50,maxPositions:100,sizing:0};
function options(raw={}){const s={...defaults,...raw};for(const k of Object.keys(defaults))if(!Number.isFinite(s[k]))throw Error('Invalid strategy '+k);for(const [k,lo,hi] of [['tradeMode',0,5],['add',0,1],['direction',-1,1],['exitType',0,3],['atrPeriod',2,200],['maxPositions',1,1000],['sizing',0,1]])if(!Number.isInteger(s[k])||s[k]<lo||s[k]>hi)throw Error('Invalid strategy '+k);if(s.atrMult<.1||s.atrMult>20||s.minProfit<0||s.minProfit>10000||s.takeProfit<=0||s.takeProfit>100000||s.stopLoss<=0||s.stopLoss>100)throw Error('Invalid profit / stop / ATR settings');return s;}
function label(raw){const s=options(raw);return modes[s.tradeMode]+' · '+(s.add?'add':'no add')+' · '+(s.direction===0?'long + short':s.direction>0?'long only':'short only')+' · '+['no extra exit','Chandelier profit','TP / SL','Chandelier + TP / SL'][s.exitType];}
function backtest(rows,sig,c,range={},raw={}){const s=options(raw),from=range.from??0,to=range.to??rows.length;let cash=c.balance,positions=[],peak=c.balance,dd=0,trades=0,wins=0,fees=0,hold=0,gaps=0,skipped=0,profit=0,loss=0,entries=0,maxOpen=0,liquidations=0,profitExits=0,switchExits=0,atr=0,trSum=0,trCount=0;const curve=[];
function value(p,price,time){const n=p.amount*c.leverage,exit=price*(1-p.side*c.slip/100),h=n*(c.borrow+p.side*c.funding)/100*Math.max(0,time-p.t)/3600000;return {net:n*p.side*(exit/p.entry-1)-n*c.fee/50-h,h};}
function equity(price,time){return cash+positions.reduce((sum,p)=>sum+p.amount+Math.max(-p.amount,value(p,price,time).net),0);}
function close(p,price,time,reason){const r=value(p,price,time),net=Math.max(-p.amount,r.net);cash+=p.amount+net;positions.splice(positions.indexOf(p),1);trades++;if(net>0){wins++;profit+=net;}else loss-=net;fees+=2*p.amount*c.leverage*c.fee/100;hold+=r.h;if(reason==='liquidation')liquidations++;if(reason==='profit')profitExits++;if(reason==='switch')switchExits++;}
function barrier(p,netPct,time){const rate=(c.borrow+p.side*c.funding)/100*Math.max(0,time-p.t)/3600000;return p.entry*(1+(netPct/(100*c.leverage)+2*c.fee/100+rate)/p.side)/(1-p.side*c.slip/100);}
for(let i=from;i<to;i++){const r=rows[i],prev=rows[i-1],gap=prev&&r.t-prev.t>c.gapMs;
// ATR consumes only samples that have already completed. No current high/low in entry decisions.
if(gap){gaps++;for(const p of positions.slice())close(p,prev.c,prev.t,'gap');atr=0;trSum=0;trCount=0;}else if(i>from&&prev){const prior=rows[i-2],tr=Math.max(prev.h-prev.l,prior&&prev.t-prior.t<=c.gapMs?Math.abs(prev.h-prior.c):0,prior&&prev.t-prior.t<=c.gapMs?Math.abs(prev.l-prior.c):0);trCount++;if(trCount<=s.atrPeriod){trSum+=tr;if(trCount===s.atrPeriod)atr=trSum/s.atrPeriod;}else atr=(atr*(s.atrPeriod-1)+tr)/s.atrPeriod;}
const signal=!gap&&i>from?sig[i-1]:0,arrow=signal!==0&&signal!==(i-2>=from?sig[i-2]:0),event=s.tradeMode===0||arrow;let closedOpposite=false;
for(const p of positions.slice()){const opposite=signal&&signal!==p.side,flat=s.tradeMode===0&&signal!==p.side;if(flat||event&&opposite&&[1,3,5].includes(s.tradeMode)){if(s.tradeMode!==3||value(p,r.o,r.t).net>Math.max(0,p.amount*s.minProfit/100)){close(p,r.o,r.t,'switch');closedOpposite=true;}}}
if((s.tradeMode===0&&!s.add||arrow)&&signal&&(s.direction===0||s.direction===signal)&&!(s.tradeMode===5&&closedOpposite)&&!(s.tradeMode===4&&positions.some(p=>p.side!==signal))){
 const same=positions.some(p=>p.side===signal);if(s.add||!same){const amount=(s.sizing===1?cash:equity(r.o,r.t))*c.allocation/100;if(amount>0&&cash+1e-9>=amount&&positions.length<s.maxPositions){const p={amount,side:signal,entry:r.o*(1+signal*c.slip/100),t:r.t,high:r.o,low:r.o,stop:null};if(value(p,r.o,r.t).net<=-amount*c.liq/100)skipped++;else{cash-=amount;positions.push(p);entries++;maxOpen=Math.max(maxOpen,positions.length);}}else skipped++;}}
for(const p of positions.slice()){
 const adverse=p.side>0?r.l:r.h,liq=barrier(p,-c.liq,r.t);if(value(p,adverse,r.t).net<=-p.amount*c.liq/100){close(p,value(p,r.o,r.t).net<=-p.amount*c.liq/100?r.o:liq,r.t,'liquidation');continue;}
 // Adverse barrier first when OHLC cannot tell which event occurred first.
 if(s.exitType>=2&&value(p,adverse,r.t).net<=-p.amount*s.stopLoss/100){const stop=barrier(p,-s.stopLoss,r.t);close(p,value(p,r.o,r.t).net<=-p.amount*s.stopLoss/100?r.o:stop,r.t,'stop');continue;}
 if((s.exitType===1||s.exitType===3)&&atr>0){const trail=p.side>0?p.high-atr*s.atrMult:p.low+atr*s.atrMult;p.stop=p.stop===null?trail:p.side>0?Math.max(p.stop,trail):Math.min(p.stop,trail);if(p.side>0?r.l<=p.stop:r.h>=p.stop){const exit=p.side>0?Math.min(r.o,p.stop):Math.max(r.o,p.stop);if(value(p,exit,r.t).net>Math.max(0,p.amount*s.minProfit/100)){close(p,exit,r.t,'profit');continue;}}}
 if(s.exitType>=2){const favorable=p.side>0?r.h:r.l;if(value(p,favorable,r.t).net>=p.amount*s.takeProfit/100){const tp=barrier(p,s.takeProfit,r.t);close(p,value(p,r.o,r.t).net>=p.amount*s.takeProfit/100?r.o:tp,r.t,'profit');continue;}}
 // High/low update becomes available for the next sample's stop, avoiding favorable-first bias.
 p.high=Math.max(p.high,r.h);p.low=Math.min(p.low,r.l);
}
const eq=equity(r.c,r.t);if(!Number.isFinite(eq)||Math.abs(eq)>1e100)return {invalid:true,reason:'Numerical overflow in strategy simulation',score:-1e9,curve:[],gaps,skipped};peak=Math.max(peak,eq);dd=Math.max(dd,(peak-eq)/peak*100);if(i===from||i===to-1||(i-from)%Math.max(1,Math.floor((to-from)/200))===0)curve.push({t:r.t,equity:eq});
}
if(to>from)for(const p of positions.slice())close(p,rows[to-1].c,rows[to-1].t,'end');const roi=(cash/c.balance-1)*100;return {balance:cash,roi,drawdown:dd,trades,wins,winRate:trades?wins/trades*100:0,profitFactor:loss?profit/loss:null,fees,holding:hold,gaps,skipped,entries,maxOpen,liquidations,profitExits,switchExits,score:trades>=5?roi-dd*1.5:-1e9,curve};}
const api={modes,defaults,options,label,backtest};root.TradeStrategy=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

/* Current, collateral-specific SDK estimates. Research/paper data, never execution quotes. */
(function(root){'use strict';
const CHAINS=new Set([42161,137,8453]),family=s=>String(s).toUpperCase().replace(/DEGEN(?=\/)/,'');
function finite(value,label){if(value===null||value===undefined||value==='')throw Error('Missing '+label);const n=Number(value);if(!Number.isFinite(n))throw Error('Invalid '+label);return n;}
function sourceTime(value,now){const at=typeof value==='string'?Date.parse(value):Number(value);if(!Number.isFinite(at)||at<=0||at>now+2000||now-at>=120000)throw Error('Chain fee snapshot missing, stale or future');return Math.min(at,now);}
function snapshot(raw,chainId,now=Date.now()){if(!CHAINS.has(chainId)||!Array.isArray(raw?.collaterals)||!Array.isArray(raw?.pairs)||!Number.isSafeInteger(Number(raw.currentBlock))||Number(raw.currentBlock)<=0)throw Error('Invalid chain fee snapshot');const at=sourceTime(raw.lastRefreshed,now),collaterals=new Map();for(const c of raw.collaterals){const ci=Number(c.collateralIndex);if(!Number.isInteger(ci)||ci<1||collaterals.has(ci))throw Error('Ambiguous collateral registry');collaterals.set(ci,{collateralIndex:ci,symbol:c.symbol,collateralConfig:c.collateralConfig,prices:c.prices,fundingFees:c.fundingFees,pairOis:c.pairOis,borrowingFees:{v2:c.borrowingFees?.v2}});}return {chainId,at,block:Number(raw.currentBlock),pairs:raw.pairs,collaterals};}
function calculate(state,ci,pi,quote,math=root.GainsMath,now=Date.now()){
 if(!state||!CHAINS.has(state.chainId)||!Number.isInteger(pi)||pi<0||!Number.isInteger(ci)||ci<1)throw Error('Invalid chain/collateral/market');sourceTime(state.at,now);
 const pair=state.pairs[pi],symbol=pair?String(pair.from).split('_')[0]+'/'+pair.to:'';
 if(!symbol||pair.to!=='USD'||quote?.chainId!==42161||family(quote.market)!==family(symbol))throw Error('Reference market mismatch');
 const qt=finite(quote.at,'reference timestamp');if(qt<=0||qt>now||now-qt>=5000)throw Error('Reference price stale or future');const price=finite(quote.price,'reference price');if(price<=0)throw Error('Invalid reference price');
 const c=state.collaterals.get(ci),params=c?.fundingFees?.pairParams?.[pi],data=c?.fundingFees?.pairData?.[pi],oi=c?.pairOis?.[pi];
 if(!params||!data||!oi?.token||typeof params.fundingFeesEnabled!=='boolean'||typeof params.aprMultiplierEnabled!=='boolean')throw Error('Incomplete collateral funding state');
 for(const k of ['skewCoefficientPerYear','absoluteVelocityPerYearCap','absoluteRatePerSecondCap','thetaThresholdUsd'])if(finite(params[k],k)<0)throw Error('Negative funding parameter');
 for(const k of ['accFundingFeeLongP','accFundingFeeShortP','lastFundingRatePerSecondP','lastFundingUpdateTs'])finite(data[k],k);
 const update=Number(data.lastFundingUpdateTs),ts=Math.floor(now/1000);if(!Number.isSafeInteger(update)||update<0||params.fundingFeesEnabled&&update===0||update>ts)throw Error('Invalid funding state time');
 const longToken=finite(oi.token.oiLongToken,'long token OI')/1e18,shortToken=finite(oi.token.oiShortToken,'short token OI')/1e18;if(longToken<0||shortToken<0)throw Error('Negative token OI');
 const convertedParams=math.convertFundingFeeParams(params),convertedData=math.convertPairFundingFeeData(data),borrowParams=c.borrowingFees?.v2?.pairParams?.[pi],borrowData=c.borrowingFees?.v2?.pairData?.[pi];
 let borrowingParams=null,borrowingData=null;if(borrowParams&&borrowData){if(finite(borrowParams.borrowingRatePerSecondP,'borrowing rate')<0)throw Error('Negative borrowing');borrowingParams=math.convertBorrowingFeeParamsV2(borrowParams);borrowingData=math.convertPairBorrowingFeeDataV2(borrowData);}
 const net=longToken-shortToken,r=math.getPairHoldingFeeRates({fundingParams:convertedParams,fundingData:convertedData,pairOiToken:{oiLongToken:longToken,oiShortToken:shortToken},netExposureToken:net,netExposureUsd:net*price,borrowingParams,borrowingData,currentPairPrice:price,currentTimestamp:ts});
 const long=r.fundingFeeLongHourlyRate,short=r.fundingFeeShortHourlyRate,borrow=borrowingParams?r.borrowingFeeHourlyRate:NaN;if(![long,short].every(Number.isFinite)||borrowingParams&&(!Number.isFinite(borrow)||borrow<0))throw Error('Nonfinite SDK fee estimate');
 return {long,short,borrow,at:now,expiresAt:Math.min(state.at+120000,qt+120000),stateAt:state.at,quoteAt:qt,chainId:state.chainId,ci,pi,market:symbol,block:state.block,kind:'sdk-estimate',referenceChainId:42161};
}
const api={snapshot,calculate,sourceTime};root.HoldingRates=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

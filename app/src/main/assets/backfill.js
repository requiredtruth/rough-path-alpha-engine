/* Only owned, open exposure enables automatic gap repair. Public trades never do. */
(function(root){'use strict';
function family(pair){return pair===300?0:pair===313?1:pair;}
function hasPositions(pair,...lists){return lists.some(rows=>Array.isArray(rows)&&rows.some(p=>p&&p.isOpen!==false&&Number.isInteger(p.pair)&&family(p.pair)===family(pair)));}
function baseHistoryStatus(value){const parts=String(value||'').slice(0,1024).split(' · ').map(s=>s.trim()).filter(s=>s&&!/^(?:no positions|backfill paused(?: \(no positions\))?|backfill pending|gaps: \d+|\d+ (?:gaps|amber placeholders)|repair scheduled|retry scheduled)$/i.test(s));return parts.join(' · ')||'Cached/live candles';}
function historyStatus(base,gaps,active){const text=baseHistoryStatus(base),count=Math.max(0,Math.floor(Number(gaps)||0));return text+(active?(count?' · gaps: '+count+' · backfill pending':''):' · No positions · backfill paused');}
const api={family,hasPositions,baseHistoryStatus,historyStatus};root.Backfill=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

/* Only owned, open exposure enables automatic gap repair. Public trades never do. */
(function(root){'use strict';
function family(pair){return pair===300?0:pair===313?1:pair;}
function hasPositions(pair,...lists){return lists.some(rows=>Array.isArray(rows)&&rows.some(p=>p&&p.isOpen!==false&&Number.isInteger(p.pair)&&family(p.pair)===family(pair)));}
const api={family,hasPositions};root.Backfill=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

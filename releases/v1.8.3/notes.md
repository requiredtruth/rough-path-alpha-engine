v1.8.3 fixes the remaining unsupported backend-frame warning

A real Arbitrum tradingVariables event measured approximately 2.98 MB. The previous shared 1 MB price-frame limit rejected it even though it was a valid chain snapshot.

- Backend events now use a bounded 16 MB allowance; price feeds retain the 1 MB limit and strict quote freshness checks.
- Oversize and malformed messages identify the correct transport instead of calling backend events unsupported price frames.
- Hosts and endpoints distinguish recovered issues from current failures.
- Added a regression test and a production-facade live backend check; existing price, spot, OI, signature and mobile tests remain required.

Both receiving spot streams still require two minutes of uninterrupted data before CVD is ready.

package com.roughpath.alpha;
import java.net.URL;
/** Read-only public market data routes exposed to the bundled WebView. */
public final class PublicDataPolicy {
 public static boolean allows(String value){try{URL u=new URL(value);String h=u.getHost(),p=u.getPath();boolean coinbase=h.equals("api.exchange.coinbase.com")&&p.matches("/products/[A-Z0-9]{1,20}-USD/(candles|trades)");boolean gains=h.matches("(^|.*\\.)gains\\.(trade|dev)")&&(p.matches("/v1/(polygon|arbitrum|base)/(markets|prices)")||p.equals("/charts")||p.equals("/open-trades")||p.matches("/trading-variables(?:/[A-Za-z0-9,]+)?")||p.matches("/api/holding-rates/[0-9]+/[0-9]+")||p.matches("/api/trading-history/[A-Za-z0-9/_-]*")||p.matches("/v1/(polygon|arbitrum|base)/markets/[A-Z0-9%/-]+/(candles|funding)"));return value.length()<=1200&&u.getProtocol().equals("https")&&u.getPort()==-1&&u.getUserInfo()==null&&(coinbase||gains);}catch(Exception e){return false;}}
}

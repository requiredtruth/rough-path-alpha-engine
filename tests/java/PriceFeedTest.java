import com.roughpath.alpha.*;import org.json.*;
public class PriceFeedTest {
 static void check(boolean b,String msg){if(!b)throw new AssertionError(msg);}
 public static void main(String[] args)throws Exception{MarketStore.init(new android.content.Context());MarketStore.reset();long now=System.currentTimeMillis();
  check(PriceFeed.ingest("[0,100,1,20]",now)==4,"legacy price frames populate mark and index");check(MarketStore.priceOf(0)==100,"native quote updated");check(new JSONObject(MarketStore.snapshot()).getJSONObject("indexPrices").getDouble("0")==100,"legacy native index parity with Engine.parseV4");
  check(PriceFeed.ingest("["+now+"]",now)==0,"heartbeat is not a price");
  check(PriceFeed.ingest("{\"m\":[0,101],\"i\":[0,99],\"t\":"+now+"}",now)==2,"mark/index frame");JSONObject snap=new JSONObject(MarketStore.snapshot());check(snap.getJSONObject("indexPrices").getDouble("0")==99,"real index saved");
  check(PriceFeed.ingest("{broken",now)==0,"malformed JSON rejected");
  check(PriceFeed.ingest("[2,null,1,21,2.5,9,0,102]",now)==4,"bad pair cannot suppress later valid prices");check(MarketStore.priceOf(0)==102,"continued parsing");
  check(PriceFeed.ingest("{\"m\":[0,500],\"t\":"+(now-5000)+"}",now)==0,"stale frame");check(PriceFeed.ingest("{\"m\":[0,500],\"t\":"+(now+2001)+"}",now)==0,"future frame");check(MarketStore.priceOf(0)==102,"invalid timestamps cannot replace quote");
  check(PriceFeed.ingest("{\"m\":[0,102],\"t\":"+(now+100)+"}",now)==1,"small real source clock skew clamped to receipt");check(PriceFeed.snapshot(new JSONObject().put("time",now).put("closes",new JSONArray("[102,21]")),now)==2,"fresh HTTPS snapshot recovery");check(PriceFeed.snapshot(new JSONObject().put("time",now-60000).put("closes",new JSONArray("[102]")),now)==0,"historical snapshot cannot become fresh quote");
  PriceFeed.registry(new JSONObject("{\"data\":[{\"symbol\":\"BTC/USD\",\"pairIndex\":0},{\"symbol\":\"ETH/USD\",\"pairIndex\":1}]}"));
  JSONObject row=new JSONObject().put("market","BTC/USD").put("mark","103").put("index","101").put("updatedAt",now);
  check(PriceFeed.apiPrices(new JSONObject().put("data",new JSONArray().put(row)).toString(),now)==2,"modern mark/index ingestion");check(MarketStore.priceOf(0)==103,"modern mark is not index");
  row.put("updatedAt",now-5000);check(PriceFeed.apiPrices(new JSONObject().put("data",new JSONArray().put(row)).toString(),now)==0,"modern stale row rejected");
  row.put("market","UNKNOWN/USD").put("updatedAt",now);check(PriceFeed.apiPrices(new JSONObject().put("data",new JSONArray().put(row)).toString(),now)==0,"unknown market never assigned guessed index");
  check(PriceFeed.apiPrices("{\"op\":\"ping\"}",now)==0,"application heartbeat not a quote");
  String costs="{\"fee\":0,\"slip\":0,\"borrow\":0,\"funding\":0,\"liq\":90}";check(MarketStore.open(0,true,10,10,costs).equals("OK"),"foreground recovery quote enables native paper order");PriceFeed.ingest("[0,80]",System.currentTimeMillis());check(new JSONObject(MarketStore.book()).getJSONArray("positions").length()==0,"recovery ticks settle native liquidation");
  System.out.println("PASS: real native frame ingestion, independent mark/index, heartbeats, mixed invalid pairs, stale/future timestamps and recovery-ledger liquidation.");
 }
}

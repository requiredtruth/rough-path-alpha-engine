package com.roughpath.alpha;
import org.json.*;
/** Parse live frames identically for native and foreground recovery transports. */
public final class PriceFeed {
 public static int ingest(String raw,long received){
  if(raw==null||raw.length()>1000000||received<=0||received>System.currentTimeMillis())return 0;
  try{JSONObject frame=raw.trim().startsWith("{")?new JSONObject(raw):null;long stamp=received;if(frame!=null&&frame.has("t")){double source=frame.optDouble("t",Double.NaN);if(!Double.isFinite(source)||source<=0){MarketStore.feedError="Invalid source timestamp";return 0;}if(source>=1e17)source/=1e6;else if(source>=1e14)source/=1000;else if(source<1e12)source*=1000;if(source-received>2000||received-source>=5000){MarketStore.feedError="Rejected source clock: "+(long)(source-received)+" ms vs device";return 0;}stamp=Math.min(received,(long)source);}
   int index=apply(frame==null?null:frame.optJSONArray("i"),stamp,true),mark=apply(frame==null?new JSONArray(raw):frame.optJSONArray("m"),stamp,false);
   if(mark+index>0){MarketStore.feedError="";MarketStore.lastAcceptedFrame=received;}return mark+index;
  }catch(Exception e){MarketStore.feedError="Invalid price frame";return 0;}
 }
 public static int snapshot(JSONObject data,long received){try{if(!data.has("time"))return 0;JSONArray closes=data.getJSONArray("closes"),m=new JSONArray();for(int i=0;i<closes.length()&&i<=1000;i++){Object value=closes.opt(i);if(value instanceof Number&&Double.isFinite(((Number)value).doubleValue())&&((Number)value).doubleValue()>0)m.put(i).put(value);}return ingest(new JSONObject().put("m",m).put("t",data.get("time")).toString(),received);}catch(Exception e){return 0;}}
 private static int apply(JSONArray a,long stamp,boolean index){if(a==null||a.length()<2||a.length()%2!=0)return 0;int count=0;for(int k=0;k<a.length();k+=2){try{Object id=a.get(k),v=a.get(k+1);if(!(id instanceof Number)||!(v instanceof Number))continue;double pi=((Number)id).doubleValue(),value=((Number)v).doubleValue();if(!Double.isFinite(pi)||pi!=Math.rint(pi)||pi<0||pi>1000||!Double.isFinite(value)||value<=0)continue;int pair=(int)pi;if(index)MarketStore.indexTick(pair,value,stamp);else MarketStore.tick(pair,value,stamp);count++;}catch(Exception ignored){}}return count;}
}

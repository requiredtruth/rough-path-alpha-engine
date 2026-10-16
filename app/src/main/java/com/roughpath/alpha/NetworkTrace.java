package com.roughpath.alpha;
import org.json.*;import java.util.ArrayDeque;
/** Bounded native transport journal; excludes response bodies and credentials. */
public final class NetworkTrace {
 private static final ArrayDeque<JSONObject> rows=new ArrayDeque<>();private static long serial=0;
 public static synchronized void log(String url,String state,String detail){try{String safe=url.split("\\?",2)[0].replaceAll("0x[0-9a-fA-F]{40,}","[redacted]");String message=detail==null?"":detail.replaceAll("0x[0-9a-fA-F]{40,}","[redacted]");if(message.length()>250)message=message.substring(0,250);JSONObject previous=rows.peekLast();if(previous!=null&&previous.optString("url").equals(safe)&&previous.optString("state").equals(state)&&previous.optString("detail").equals(message)&&System.currentTimeMillis()-previous.optLong("at")<10000)return;rows.add(new JSONObject().put("id",++serial).put("at",System.currentTimeMillis()).put("url",safe).put("state",state).put("detail",message));while(rows.size()>100)rows.removeFirst();}catch(Exception ignored){}}
 public static synchronized String snapshot(){return new JSONArray(rows).toString();}
}

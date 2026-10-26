const MINT='619k8nfLocMxXCqDWei37QxTnZ114LfuHQSdU19pump';
const TTL=15_000;
const memory=globalThis.__seededMarketCache??=new Map();
const send=(res,status,body)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(body));};
const timeout=ms=>AbortSignal.timeout(ms);
async function supabaseRequest(path,options={}){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  const r=await fetch(`${url}/rest/v1/${path}`,{...options,signal:timeout(5000),headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'return=representation',...(options.headers||{})}});
  if(!r.ok)return null;return r.status===204?null:r.json();
}
function normalize(mint,pair,fetchedAt,source='dexscreener'){
  if(!pair)return {mint,status:'unavailable',marketCapUsd:null,volume24hUsd:null,liquidityUsd:null,priceUsd:null,pairAddress:null,dexId:null,url:null,fetchedAt,source};
  return {mint,status:'live',marketCapUsd:pair.marketCap??pair.fdv??null,volume24hUsd:pair.volume?.h24??null,liquidityUsd:pair.liquidity?.usd??null,priceUsd:pair.priceUsd??null,pairAddress:pair.pairAddress??null,dexId:pair.dexId??null,url:pair.url??null,fetchedAt,source};
}
async function readDb(mint){
  const rows=await supabaseRequest(`seeded_market_cache?mint=eq.${encodeURIComponent(mint)}&select=*`);const r=rows?.[0];return r?{mint:r.mint,status:r.status,marketCapUsd:r.market_cap_usd,volume24hUsd:r.volume_24h_usd,liquidityUsd:r.liquidity_usd,priceUsd:r.price_usd,pairAddress:r.pair_address,dexId:r.dex_id,url:r.url,fetchedAt:r.fetched_at,source:r.source}:null;
}
async function writeDb(row){
  await supabaseRequest('seeded_market_cache?on_conflict=mint',{method:'POST',headers:{'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({mint:row.mint,status:row.status,market_cap_usd:row.marketCapUsd,volume_24h_usd:row.volume24hUsd,liquidity_usd:row.liquidityUsd,price_usd:row.priceUsd,pair_address:row.pairAddress,dex_id:row.dexId,url:row.url,fetched_at:row.fetchedAt,source:row.source})});
}
export default async function handler(req,res){
  const u=new URL(req.url,'http://localhost');const mint=u.searchParams.get('mint')||MINT;
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint))return send(res,400,{error:'invalid mint'});
  const now=Date.now();const cached=memory.get(mint);const db=await readDb(mint).catch(()=>null);const durable=db??cached;
  if(durable&&now-new Date(durable.fetchedAt).getTime()<TTL)return send(res,200,{...durable,cache:'fresh'});
  try{
    const r=await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`,{headers:{accept:'application/json'},signal:timeout(8000)});
    if(!r.ok)throw new Error(`Dexscreener ${r.status}`);
    const data=await r.json();const pairs=Array.isArray(data.pairs)?data.pairs:[];
    pairs.sort((a,b)=>(b.liquidity?.usd??0)-(a.liquidity?.usd??0));
    const row=normalize(mint,pairs[0]??null,new Date().toISOString());memory.set(mint,row);await writeDb(row).catch(()=>null);return send(res,200,{...row,cache:'refreshed'});
  }catch(error){
    if(durable)return send(res,200,{...durable,cache:'stale',error:'upstream temporarily unavailable'});
    return send(res,200,{...normalize(mint,null,new Date().toISOString()),cache:'unavailable',error:error.message});
  }
}

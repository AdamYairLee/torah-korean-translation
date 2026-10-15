// Supabase Edge Function: torah-access
// Deployment: supabase functions deploy torah-access --no-verify-jwt
// JWT verification for members occurs explicitly below; Ko-fi uses a webhook token.
// Secrets live ONLY in Supabase environment variables, never in this repository.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const kofiToken = Deno.env.get("KO_FI_VERIFICATION_TOKEN") || "";
const kofiTier = (Deno.env.get("KO_FI_MEMBERSHIP_TIER") || "").trim().toLowerCase();
const kofiCurrency = (Deno.env.get("KO_FI_CURRENCY") || "").trim().toUpperCase();
const monthlyMinimum = Number(Deno.env.get("KO_FI_MONTHLY_MIN_AMOUNT") || "0");
const allowedOrigin = Deno.env.get("TORAH_ORIGIN") || "https://jewishkorean.com";
const db = createClient(url, serviceKey, {auth:{persistSession:false,autoRefreshToken:false}});
const ALLOW_METHODS = "POST, OPTIONS";

function corsHeaders(req:Request):Record<string,string> {
  const origin = req.headers.get("origin") || "";
  const trusted = origin === allowedOrigin || origin === allowedOrigin.replace("://","://www.");
  return {
    "Access-Control-Allow-Origin": trusted ? origin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Vary":"Origin","Cache-Control":"no-store",
  };
}
function json(req:Request,value:unknown,status=200):Response{
  return new Response(JSON.stringify(value),{status,headers:{...corsHeaders(req),"Content-Type":"application/json; charset=utf-8"}});
}
function normalizedEmail(value:unknown):string{
  return String(value||"").trim().toLowerCase();
}
function addCalendarMonth(date:Date):Date{
  const y=date.getUTCFullYear(),m=date.getUTCMonth(),d=date.getUTCDate();
  const nextYear=y+Math.floor((m+1)/12),nextMonth=(m+1)%12;
  const lastDay=new Date(Date.UTC(nextYear,nextMonth+1,0)).getUTCDate();
  return new Date(Date.UTC(nextYear,nextMonth,Math.min(d,lastDay),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds(),date.getUTCMilliseconds()));
}
async function kofiWebhook(req:Request):Promise<Response>{
  if(!kofiToken || !kofiCurrency)return json(req,{error:"Ko-fi webhook not configured"},503);
  let payload:any;
  try{
    const form=await req.formData();payload=JSON.parse(String(form.get("data")||""));
  }catch{return json(req,{error:"Malformed webhook"},400);}
  if(typeof payload.verification_token!=="string" || payload.verification_token!==kofiToken)return json(req,{error:"Invalid token"},403);
  const eventId=String(payload.message_id||"");
  const transactionId=String(payload.kofi_transaction_id||"");
  const email=normalizedEmail(payload.email);
  const timestamp=new Date(String(payload.timestamp||""));
  const amount=Number(payload.amount);
  const currency=String(payload.currency||"").toUpperCase();
  if(!eventId || !transactionId || !email || !email.includes("@") || !Number.isFinite(timestamp.getTime()) || !Number.isFinite(amount) || amount<=0 || currency!==kofiCurrency){
    return json(req,{error:"Unrecognized payment details"},400);
  }
  // The Ko-fi API emits only payment notifications; cancellation must not remove already earned reading rights.
  const type=String(payload.type||"");
  if(type==="Subscription" && payload.is_subscription_payment===true){
    // A normal Ko-fi donation must never be mistaken for membership.
    if(kofiTier && monthlyMinimum>0 && String(payload.tier_name||"").trim().toLowerCase()===kofiTier && amount>=monthlyMinimum){
      const {error}=await db.from("torah_5787_membership_periods").upsert({
        transaction_id:transactionId,buyer_email:email,
        starts_at:timestamp.toISOString(),ends_at:addCalendarMonth(timestamp).toISOString()
      },{onConflict:"transaction_id"});
      if(error)return json(req,{error:"Failed to save membership"},500);
    }
  }
  // Message ID is tracked for diagnostics; duplicate rights already have unique transaction IDs.
  await db.from("torah_5787_webhook_events").upsert({message_id:eventId,transaction_id:transactionId,event_type:type},{onConflict:"message_id"});
  return json(req,{received:true});
}
type Article={id:string;title:string;published_at:string|null};
function canRead(article:Article,periods:any[],admin:boolean):boolean{
  if(admin)return true;
  if(!article.published_at)return false;
  const posted=new Date(article.published_at).getTime();
  const now=Date.now();
  return periods.some(p=>{
    const start=new Date(p.starts_at).getTime();
    const end=new Date(p.ends_at).getTime();
    if(!Number.isFinite(start) || !Number.isFinite(end) || end<=start)return false;
    // During a paid period, a member can read the already-published back catalogue.
    if(start<=now && now<end && posted<=now)return true;
    // After cancellation, retain permanent access to lessons published in a paid period.
    return start<=posted && posted<end;
  });
}
async function memberRequest(req:Request):Promise<Response>{
  if(!url || !serviceKey)return json(req,{error:"Member service not configured"},503);
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return json(req,{error:"Please sign in"},401);
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError || !user?.id || !user.email || !user.email_confirmed_at)return json(req,{error:"Verified login required"},401);
  const email=normalizedEmail(user.email);
  let body:any;
  try{body=await req.json();}catch{return json(req,{error:"Invalid request"},400);}
  if(body?.action!=="library" && body?.action!=="read")return json(req,{error:"Unknown action"},400);
  const [adminRes,periodRes]=await Promise.all([
    db.from("torah_5787_admins").select("user_id").eq("user_id",user.id).maybeSingle(),
    db.from("torah_5787_membership_periods").select("starts_at,ends_at").eq("buyer_email",email)
  ]);
  if(adminRes.error || periodRes.error)return json(req,{error:"Database lookup failed"},500);
  const admin=!!adminRes.data;
  // Administrators may review private drafts; paying readers only see published lessons.
  let articleQuery=db.from("torah_5787_articles").select("id,title,published_at");
  if(!admin)articleQuery=articleQuery.not("published_at","is",null);
  const artRes=await articleQuery;
  if(artRes.error)return json(req,{error:"Article lookup failed"},500);
  const periods=periodRes.data||[],articles=(artRes.data||[]) as Article[];
  if(body.action==="library"){
    return json(req,{admin,accessibleIds:articles.filter(a=>canRead(a,periods,admin)).map(a=>a.id)});
  }
  const id=String(body.articleId||"");
  if(!/^[0-9a-z-]{3,80}$/i.test(id))return json(req,{error:"Invalid article"},400);
  const article=articles.find(a=>a.id===id);
  if(!article || !canRead(article,periods,admin))return json(req,{error:"This lesson is not included in a paid membership period"},403);
  const {data:full,error}=await db.from("torah_5787_articles").select("title,blocks").eq("id",id).single();
  if(error || !full)return json(req,{error:"Lesson not found"},404);
  // Do not cache personalized paid content.
  return json(req,{title:full.title,blocks:full.blocks});
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(req)});
  if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);
  const type=(req.headers.get("content-type")||"").toLowerCase();
  try{
    if(type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data"))return await kofiWebhook(req);
    if(type.includes("application/json"))return await memberRequest(req);
    return json(req,{error:"Unsupported media type"},415);
  }catch{return json(req,{error:"Server error"},500);}
});

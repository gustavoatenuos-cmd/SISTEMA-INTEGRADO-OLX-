import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const OLX_API='https://apps.olx.com.br';
const OLX_AUTH='https://auth.olx.com.br';
function fail(res,status,message){return res.status(status).json({error:message});}
function service(){
  if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY){
    throw new Error('Configuração do Supabase no servidor incompleta');
  }
  return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{
    auth:{autoRefreshToken:false,persistSession:false}
  });
}
async function authorize(req,db){
  const match=/^Bearer (.+)$/.exec(String(req.headers.authorization||''));
  if(!match) throw Object.assign(new Error('Sessão não autenticada'),{status:401});
  const {data,error}=await db.auth.getUser(match[1]);
  if(error||!data?.user) throw Object.assign(new Error('Sessão expirada: entre novamente'),{status:401});
  return data.user;
}
function config(){
  const {OLX_CLIENT_ID,OLX_CLIENT_SECRET,OLX_REDIRECT_URI,APP_ORIGIN}=process.env;
  if(!OLX_CLIENT_ID||!OLX_CLIENT_SECRET||!OLX_REDIRECT_URI||!APP_ORIGIN){
    throw new Error('Credenciais OLX não configuradas no servidor');
  }
  if(!OLX_REDIRECT_URI.startsWith('https://')||!APP_ORIGIN.startsWith('https://')){
    throw new Error('URLs de produção precisam usar HTTPS');
  }
  return {id:OLX_CLIENT_ID,secret:OLX_CLIENT_SECRET,redirect:OLX_REDIRECT_URI,origin:APP_ORIGIN};
}
async function connection(db,userId){
  const {data,error}=await db.from('olx_connections').select('access_token').eq('user_id',userId).maybeSingle();
  if(error)throw error;
  if(!data?.access_token)throw Object.assign(new Error('Conecte a conta OLX em Configurações'),{status:409});
  return data.access_token;
}
async function olxRequest(path,method,body){
  const response=await fetch(OLX_API+path,{
    method,
    headers:{'Content-Type':'application/json','User-Agent':'ShoppingCar-OLX-Integrator/1.0'},
    body:JSON.stringify(body)
  });
  const value=await response.json().catch(()=>({error:'Resposta inválida da OLX'}));
  if(!response.ok)throw Object.assign(new Error('OLX HTTP '+response.status+': '+JSON.stringify(value).slice(0,400)),{status:502});
  return value;
}
function validate(v){
  const errors=[];
  if(!/^[A-Za-z0-9_{}-]{1,19}$/.test(String(v.ad_id||'')))errors.push('Identificador do anúncio');
  if(String(v.title||'').trim().length<2||String(v.title||'').length>90)errors.push('Título (2–90)');
  if(String(v.description||'').trim().length<2||String(v.description||'').length>6000)errors.push('Descrição (2–6.000)');
  if(!Number.isInteger(Number(v.price))||Number(v.price)<=0)errors.push('Preço');
  if(!/^\d{8}$/.test(String(v.zipcode||'').replace(/\D/g,'')))errors.push('CEP do veículo');
  if(!/^\d{10,11}$/.test(String(v.phone||'').replace(/\D/g,'')))errors.push('Telefone');
  if(!Number.isInteger(Number(v.mileage))||Number(v.mileage)<0)errors.push('Quilometragem');
  if(!Number.isInteger(Number(v.year))||Number(v.year)<1950)errors.push('Ano');
  if(!v.brand_id||!v.model_id||!v.version_id)errors.push('Marca, modelo e versão oficiais');
  if(!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(String(v.plate||'').toUpperCase().replace(/[^A-Z0-9]/g,'')))errors.push('Placa do usado');
  if(!Array.isArray(v.images)||v.images.length<1||v.images.length>20)errors.push('De 1 a 20 fotos');
  else if(v.images.some(x=>!/^https:\/\//i.test(x)))errors.push('Fotos precisam ser HTTPS públicas');
  if(!Array.isArray(v.target_cities)||v.target_cities.length>14)errors.push('Até 14 cidades comerciais');
  return errors;
}
function vehiclePayload(v){
  const params={
    regdate:String(v.year),
    mileage:Number(v.mileage),
    vehicle_brand:String(v.brand_id),
    vehicle_model:String(v.model_id),
    vehicle_version:String(v.version_id),
    vehicle_tag:String(v.plate).toUpperCase().replace(/[^A-Z0-9]/g,'')
  };
  const optionals={gearbox:v.gearbox,fuel:v.fuel,carcolor:v.color,doors:v.doors};
  for(const [k,val] of Object.entries(optionals))if(val)params[k]=String(val);
  if(Array.isArray(v.features)&&v.features.length)params.car_features=v.features.filter(x=>/^\d+$/.test(String(x)));
  const ad={
    id:v.ad_id,operation:'insert',category:2020,subject:v.title,
    body:v.description,phone:Number(String(v.phone).replace(/\D/g,'')),
    type:'s',price:Number(v.price),zipcode:String(v.zipcode).replace(/\D/g,''),
    params,images:v.images
  };
  if(v.youtube_url)ad.videos=[v.youtube_url];
  return ad;
}
async function getVehicle(db,userId,id){
  if(!/^[a-f0-9-]{36}$/i.test(String(id||'')))throw Object.assign(new Error('ID de veículo inválido'),{status:400});
  const {data,error}=await db.from('vehicles').select('*').eq('id',id).eq('user_id',userId).maybeSingle();
  if(error)throw error;
  if(!data)throw Object.assign(new Error('Veículo não encontrado'),{status:404});
  return data;
}
async function patchVehicle(db,id,userId,fields){
  const {error}=await db.from('vehicles').update({...fields,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId);
  if(error)throw error;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method))return fail(res,405,'Método não permitido');
  try{
    const db=service();
    const query=new URL(req.url,'http://localhost').searchParams;
    // Retorno OAuth: validamos state emitido para um usuário autenticado previamente.
    if(req.method==='GET'&&query.get('callback')==='1'){
      const cfg=config();
      const state=query.get('state');
      if(!state||!/^[a-f0-9-]{36}$/i.test(state))return res.redirect(302,cfg.origin+'/?olx=invalid_state');
      const {data:states,error:sErr}=await db.from('olx_oauth_states')
        .delete().eq('state',state).select('user_id,expires_at').maybeSingle();
      if(sErr||!states||new Date(states.expires_at).getTime()<Date.now())return res.redirect(302,cfg.origin+'/?olx=expired_state');
      if(query.get('error')||!query.get('code'))return res.redirect(302,cfg.origin+'/?olx=denied');
      const body=new URLSearchParams({
        code:query.get('code'),client_id:cfg.id,client_secret:cfg.secret,
        redirect_uri:cfg.redirect,grant_type:'authorization_code'
      });
      const response=await fetch(OLX_AUTH+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.access_token)return res.redirect(302,cfg.origin+'/?olx=exchange_failed');
      const {error}=await db.from('olx_connections').upsert({
        user_id:states.user_id,access_token:data.access_token,connected_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(error)throw error;
      return res.redirect(302,cfg.origin+'/?olx=connected');
    }
    const user=await authorize(req,db);
    const action=query.get('action')||'connection';
    if(req.method==='GET'&&action==='connection'){
      const {data,error}=await db.from('olx_connections').select('connected_at').eq('user_id',user.id).maybeSingle();
      if(error)throw error;
      return res.json({connected:Boolean(data),connected_at:data?.connected_at||null,configured:Boolean(process.env.OLX_CLIENT_ID)});
    }
    if(req.method==='GET'&&action==='connect'){
      const cfg=config();
      const state=randomUUID();
      const {error}=await db.from('olx_oauth_states').insert({
        state,user_id:user.id,expires_at:new Date(Date.now()+10*60*1000).toISOString()
      });
      if(error)throw error;
      const url=new URL(OLX_AUTH+'/oauth');
      url.searchParams.set('response_type','code');
      url.searchParams.set('client_id',cfg.id);
      url.searchParams.set('redirect_uri',cfg.redirect);
      url.searchParams.set('scope','autoupload');
      url.searchParams.set('state',state);
      return res.json({url:url.toString()});
    }
    if(req.method==='GET'&&action==='catalog'){
      const access_token=await connection(db,user.id);
      const level=query.get('level');
      const brand=query.get('brand');
      const model=query.get('model');
      if(!['brand','model','version'].includes(level))return fail(res,400,'Nível inválido');
      if(level!=='brand'&&!/^\d+$/.test(String(brand||'')))return fail(res,400,'Marca inválida');
      if(level==='version'&&!/^\d+$/.test(String(model||'')))return fail(res,400,'Modelo inválido');
      const path='/autoupload/car_info'+(level==='brand'?'':'/'+brand)+(level==='version'?'/'+model:'');
      const result=await olxRequest(path,'POST',{access_token});
      const entries=Object.entries(result.data||{}).map(([label,id])=>({label,value:String(id)}))
        .sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
      return res.json({options:entries});
    }
    if(req.method==='POST'&&action==='disconnect'){
      const {error}=await db.from('olx_connections').delete().eq('user_id',user.id);
      if(error)throw error;
      return res.json({ok:true});
    }
    if(req.method==='POST'&&['publish','check','unpublish'].includes(action)){
      const v=await getVehicle(db,user.id,req.body?.vehicleId);
      const access_token=await connection(db,user.id);
      if(action==='publish'){
        if(v.status==='sold')return fail(res,409,'Veículo vendido: não é possível republicá-lo');
        const errors=validate(v);
        if(errors.length)return fail(res,422,'Campos pendentes: '+errors.join(', '));
        const payload={access_token,ad_list:[vehiclePayload(v)]};
        if(Buffer.byteLength(JSON.stringify(payload),'utf8')>1024*1024)return fail(res,422,'Payload OLX ultrapassa 1 MB');
        const result=await olxRequest('/autoupload/import','PUT',payload);
        if(result.statusCode!==0||!result.token)return fail(res,422,'Importação recusada: '+JSON.stringify(result.errors||result.statusMessage).slice(0,600));
        await patchVehicle(db,v.id,user.id,{status:'pending',pending_operation:'insert',import_token:result.token,last_error:null});
        return res.json({ok:true,token:result.token,message:'Enviado para análise da OLX. Aguarde a consulta do status.'});
      }
      if(action==='unpublish'){
        if(!v.import_token&&!v.olx_list_id)return fail(res,409,'Este anúncio ainda não foi publicado pela integração');
        const result=await olxRequest('/autoupload/import','PUT',{access_token,ad_list:[{id:v.ad_id,operation:'delete'}]});
        if(result.statusCode!==0||!result.token)return fail(res,422,'Não foi possível enviar a remoção: '+JSON.stringify(result.errors||result.statusMessage).slice(0,600));
        await patchVehicle(db,v.id,user.id,{status:'pending',pending_operation:'delete',import_token:result.token,last_error:null});
        return res.json({ok:true,token:result.token,message:'Solicitação de retirada enviada à OLX.'});
      }
      if(!v.import_token)return fail(res,409,'Nenhuma importação pendente para consultar');
      const result=await olxRequest('/autoupload/import/'+encodeURIComponent(v.import_token),'POST',{access_token});
      const ad=result.ads?.[v.ad_id]||Object.values(result.ads||{})[0];
      if(!ad)return res.json({ok:true,status:'pending',message:'A OLX ainda não retornou esse anúncio.',raw:result.autoupload_status});
      const resultStatus=ad.status;
      const current=v.pending_operation==='delete'?'removed':resultStatus==='accepted'?'published':resultStatus==='refused'||resultStatus==='error'?'refused':'pending';
      const errors=Array.isArray(ad.message)?ad.message.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('; '):String(ad.message||'');
      await patchVehicle(db,v.id,user.id,{
        status:current,olx_list_id:ad.list_id||v.olx_list_id,
        olx_url:ad.url||v.olx_url,last_error:current==='refused'?errors||'Anúncio recusado':null,
        pending_operation:current==='pending'?v.pending_operation:null
      });
      return res.json({ok:true,status:current,message:errors||'Status atualizado',url:ad.url||v.olx_url});
    }
    return fail(res,404,'Operação não encontrada');
  }catch(e){
    console.error('[olx-api]',e instanceof Error?e.message:e);
    return fail(res,e.status||500,e.message||'Erro no servidor');
  }
}
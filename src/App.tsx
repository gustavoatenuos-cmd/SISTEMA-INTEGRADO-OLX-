import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard, CarFront, MapPin, Settings2, Plus, Search, ArrowUpRight,
  UploadCloud, X, Trash2, ExternalLink, RefreshCw, CheckCircle2, ShieldCheck,
  Menu, Link2, CloudOff, LogOut, Camera, AlertCircle, Info, LockKeyhole, Eye, EyeOff,
  Navigation, Check, LoaderCircle, Globe2, ClipboardList, ChevronRight,
  Building2, SlidersHorizontal, ImagePlus, Wifi, Save, Send, ChevronDown
} from 'lucide-react';
import {
  CITY_OPTIONS, FEATURE_OPTIONS, FUEL_OPTIONS, GEARBOX_OPTIONS, cloudMode,
  getLocalVehicles, putLocalVehicles, supabase, storageBucket, newVehicle,
  money, number, toDataUrl, validateVehicle, errorText
} from './lib/data';
import type { City, Vehicle, VehicleStatus } from './lib/data';

type Page = 'overview' | 'vehicles' | 'cities' | 'settings';
type Notice = { message: string; type: 'error' | 'success' };
type Option = { label: string; value: string };

const statusText:Record<VehicleStatus,string>={
  draft:'Rascunho',pending:'Em análise',published:'Publicado',
  refused:'Recusado',sold:'Vendido',removed:'Retirado'
};
const statusColor:Record<VehicleStatus,string>={
  draft:'neutral',pending:'amber',published:'green',refused:'red',sold:'neutral',removed:'neutral'
};

async function api(action:string,token:string,method:'GET'|'POST'='GET',body?:object,extra=''){
  const response=await fetch('/api/olx?action='+action+extra,{
    method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined
  });
  const result=await response.json().catch(()=>({error:'Resposta inválida do servidor'}));
  if(!response.ok)throw new Error(result.error||'Erro de comunicação');
  return result;
}

function Pill({status}:{status:VehicleStatus}){
  return <span className={'status status-'+statusColor[status]}><span className="status-dot"/>{statusText[status]}</span>;
}

function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}){
  return <label className="field"><span className="field-label">{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}

const SHOPPING_CAR_LOGO = 'https://i.imgur.com/eKoIZdQ.png';

function BrandLogo({compact = false}:{compact?:boolean}){
  const [failed,setFailed]=useState(false);
  if(failed)return <span className={'brand-fallback'+(compact?' compact':'')}><CarFront size={compact?18:25}/><strong>SHOPPING CAR</strong></span>;
  return <img
    className={'brand-image'+(compact?' brand-image-compact':'')}
    src={SHOPPING_CAR_LOGO}
    alt="Shopping Car"
    width={208} height={80}
    loading="eager" decoding="async"
    onError={()=>setFailed(true)}
  />;
}

function SetupScreen(){
  return <div className="setup-screen"><div className="setup-card">
    <div className="brand setup-brand"><BrandLogo/><small className="brand-tagline">PORTAL DE ACESSO</small></div>
    <div className="auth-mini"><LockKeyhole size={21}/></div>
    <span className="eyebrow">ACESSO RESTRITO</span>
    <h1>Portal aguardando configuração</h1>
    <p>O login só será liberado quando o Supabase da Shopping Car estiver configurado. O painel e os dados dos veículos não ficam públicos sem autenticação.</p>
    <div className="setup-tip"><ShieldCheck size={19}/><span>Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> na Vercel. Crie os usuários autorizados no Supabase Auth.</span></div>
    <p className="setup-foot">Shopping Car · Sistema interno de gestão de anúncios</p>
  </div></div>;
}

function AuthScreen({recovery,onRecovered}:{recovery:boolean;onRecovered:()=>void}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [mode,setMode]=useState<'login'|'forgot'>(window.location.search.includes('forgot=1')?'forgot':'login');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setSuccess('');
    try{
      if(recovery){
        if(password.length<8)throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
        if(password!==confirmPassword)throw new Error('As senhas não coincidem.');
        const {error}=await supabase!.auth.updateUser({password});
        if(error)throw error;
        setPassword('');setConfirmPassword('');
        onRecovered();
        return;
      }
      if(mode==='forgot'){
        const redirectTo=window.location.origin+'/?reset-password=1';
        const {error}=await supabase!.auth.resetPasswordForEmail(email.trim(),{redirectTo});
        if(error)throw error;
        setSuccess('Se o e-mail estiver cadastrado, você receberá instruções para recuperar o acesso.');
        return;
      }
      const {error}=await supabase!.auth.signInWithPassword({email:email.trim(),password});
      if(error)throw new Error(error.message==='Invalid login credentials'?'E-mail ou senha incorretos.':error.message);
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  const title=recovery?'Nova senha de acesso':mode==='forgot'?'Recuperar acesso':'Acesse sua central';
  return <div className="auth-layout">
    <div className="auth-promo">
      <div className="brand brand-light"><BrandLogo/><small className="brand-tagline">PORTAL DE ACESSO</small></div>
      <div className="promo-bottom"><span className="eyebrow">AMBIENTE EXCLUSIVO DA EQUIPE</span><h1>Seu estoque.<br/>Sua operação.<br/><em>Tudo conectado.</em></h1>
        <p>Um único lugar para organizar o estoque, preparar anúncios e controlar a conexão oficial com a OLX.</p>
        <div className="auth-promo-steps"><span><ShieldCheck size={16}/> Acesso protegido</span><span><CarFront size={16}/> Gestão centralizada</span><span><Link2 size={16}/> Integração oficial</span></div>
      </div><div className="promo-decoration"/>
    </div>
    <div className="auth-panel"><div className="auth-card">
      <div className="auth-mini"><LockKeyhole size={20}/></div>
      <span className="eyebrow">SHOPPING CAR · PORTAL INTERNO</span>
      <h2>{title}</h2>
      <p>{recovery?'Escolha uma senha segura para voltar ao painel.':mode==='forgot'?'Enviaremos o link de redefinição para seu e-mail autorizado.':'Entre com seu e-mail e senha cadastrados pela concessionária.'}</p>
      <form onSubmit={submit} className="auth-form">
        {!recovery&&<Field label="E-mail de acesso"><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@shoppingcar.com.br"/></Field>}
        {mode==='login'||recovery?<Field label={recovery?'Nova senha':'Senha'}>
          <div className="password-input"><input type={showPassword?'text':'password'} autoComplete={recovery?'new-password':'current-password'} minLength={recovery?8:1} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={recovery?'Mínimo de 8 caracteres':'Digite sua senha'}/>
          <button type="button" className="reveal-password" onClick={()=>setShowPassword(x=>!x)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
        </Field>:null}
        {recovery&&<Field label="Confirmar nova senha"><input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repita a nova senha"/></Field>}
        {error&&<div className="inline-alert auth-error"><AlertCircle size={17}/>{error}</div>}
        {success&&<div className="inline-alert auth-success"><CheckCircle2 size={18}/>{success}</div>}
        <button className="btn btn-primary btn-wide auth-submit" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:recovery?<CheckCircle2 size={17}/>:mode==='forgot'?<Send size={17}/>:<LockKeyhole size={17}/>}
          {recovery?'Salvar nova senha':mode==='forgot'?'Enviar link de recuperação':'Entrar no sistema'} <ArrowUpRight size={17}/></button>
      </form>
      {!recovery&&<button className="link-button" onClick={()=>{setMode(mode==='login'?'forgot':'login');setError('');setSuccess('');}}>
        {mode==='login'?'Esqueci minha senha':'Voltar para o login'}
      </button>}
      <div className="auth-privacy"><ShieldCheck size={17}/><span>Portal reservado a usuários autorizados. Sua senha da OLX será solicitada somente no site oficial da OLX após conectar sua conta.</span></div>
    </div></div>
  </div>;
}

function CitySelector({value,onChange}:{value:City[];onChange:(v:City[])=>void}){
  const [search,setSearch]=useState('');
  const [custom,setCustom]=useState('');
  const [uf,setUf]=useState('PR');
  const matching=CITY_OPTIONS.filter(c=>(c.name+' '+c.state).toLowerCase().includes(search.toLowerCase()));
  const has=(c:City)=>value.some(v=>v.name.toLocaleLowerCase('pt-BR')===c.name.toLocaleLowerCase('pt-BR')&&v.state===c.state);
  const toggle=(c:City)=>{
    if(has(c)){onChange(value.filter(v=>!(v.name===c.name&&v.state===c.state)));return;}
    if(value.length>=14)return;
    onChange([...value,c]);
  };
  const addCustom=()=>{
    const name=custom.trim();
    if(!name||!/^[A-Z]{2}$/.test(uf)||value.length>=14)return;
    toggle({name,state:uf});setCustom('');
  };
  return <div className="city-picker">
    <div className="city-head"><div><b>Cidades de interesse comercial</b><p>Selecione onde deseja concentrar campanhas e prospecção.</p></div><span className="counter">{value.length} / 14</span></div>
    <div className="helper-info"><Info size={16}/><span>Estas cidades não geram anúncios duplicados. A OLX recebe somente o CEP real do veículo.</span></div>
    <div className="selected-cities">{value.length?value.map(c=><button type="button" className="city-chip selected" key={c.name+c.state} onClick={()=>toggle(c)}>{c.name} / {c.state} <X size={13}/></button>):<small>Nenhuma cidade selecionada</small>}</div>
    <div className="search-inner"><Search size={17}/><input placeholder="Buscar cidade..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="city-results">{matching.map(c=><button type="button" key={c.name+c.state} className={'city-option'+(has(c)?' active':'')} onClick={()=>toggle(c)} disabled={!has(c)&&value.length>=14}><span>{c.name} <small>{c.state}</small></span>{has(c)?<Check size={16}/>:<Plus size={15}/>}</button>)}</div>
    <div className="custom-city"><input aria-label="Nova cidade" placeholder="Outra cidade" value={custom} onChange={e=>setCustom(e.target.value)}/><input aria-label="Estado" className="uf-input" maxLength={2} value={uf} onChange={e=>setUf(e.target.value.toUpperCase())}/><button type="button" className="btn btn-light" onClick={addCustom} disabled={!custom.trim()||value.length>=14}>Adicionar</button></div>
  </div>;
}

function VehicleEditor({initial,onClose,onSave,uploadFile,connected}:{initial:Vehicle;onClose:()=>void;onSave:(v:Vehicle)=>Promise<void>;uploadFile:(file:File,vehicleId:string)=>Promise<string>;connected:boolean}){
  const [v,setV]=useState<Vehicle>({...initial,images:[...initial.images],target_cities:[...initial.target_cities],features:[...initial.features]});
  const [section,setSection]=useState<'basic'|'photos'|'cities'>('basic');
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  const [brands,setBrands]=useState<Option[]>([]);
  const [models,setModels]=useState<Option[]>([]);
  const [versions,setVersions]=useState<Option[]>([]);
  const inputRef=useRef<HTMLInputElement>(null);
  const edit=(patch:Partial<Vehicle>)=>setV(current=>({...current,...patch}));
  const getCatalog=useCallback(async(level:string,brand?:string,model?:string)=>{
    if(!connected||!supabase)return [];
    const {data}=await supabase.auth.getSession();
    if(!data.session)return [];
    const extra='&level='+level+(brand?'&brand='+encodeURIComponent(brand):'')+(model?'&model='+encodeURIComponent(model):'');
    try{const result=await api('catalog',data.session.access_token,'GET',undefined,extra);return result.options as Option[];}catch{return [];}
  },[connected]);
  useEffect(()=>{void getCatalog('brand').then(setBrands);},[getCatalog]);
  useEffect(()=>{if(v.brand_id)void getCatalog('model',v.brand_id).then(setModels);else setModels([]);},[v.brand_id,getCatalog]);
  useEffect(()=>{if(v.model_id&&v.brand_id)void getCatalog('version',v.brand_id,v.model_id).then(setVersions);else setVersions([]);},[v.brand_id,v.model_id,getCatalog]);
  const addPhotos=async(files:FileList|null)=>{
    if(!files?.length)return;
    const selected=[...files];
    if(v.images.length+selected.length>20){setError('Máximo de 20 fotos por veículo.');return;}
    setUploading(true);setError('');
    const urls:string[]=[];
    try{
      for(const file of selected){
        if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Envie apenas JPG, PNG ou WEBP.');
        if(file.size>5*1024*1024)throw new Error('Cada foto pode ter no máximo 5 MB.');
        urls.push(await uploadFile(file,v.id));
      }
      setV(current=>({...current,images:[...current.images,...urls]}));setSection('photos');
    }catch(e){setError(errorText(e));}finally{setUploading(false);if(inputRef.current)inputRef.current.value='';}
  };
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);setError('');
    try{await onSave({...v,updated_at:new Date().toISOString()});onClose();}
    catch(e){setError(errorText(e));}finally{setSaving(false);}
  };
  const changeNum=(key:keyof Vehicle,input:string)=>edit({[key]:Number(input)||0} as Partial<Vehicle>);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="editor-modal" role="dialog" aria-modal="true" aria-label="Editar veículo">
      <div className="modal-top"><div><span className="eyebrow">CADASTRO DE ESTOQUE</span><h2>{initial.title?'Editar veículo':'Novo veículo'}</h2><p>Preencha os dados uma única vez para manter o estoque organizado.</p></div><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div>
      <div className="editor-tabs"><button className={section==='basic'?'active':''} onClick={()=>setSection('basic')}>01 · Informações</button><button className={section==='photos'?'active':''} onClick={()=>setSection('photos')}>02 · Fotos e detalhes</button><button className={section==='cities'?'active':''} onClick={()=>setSection('cities')}>03 · Cidades <span>{v.target_cities.length}/14</span></button></div>
      <form onSubmit={submit} className="editor-form">
        <div className="editor-scroll">
        {section==='basic'&&<div className="form-section">
          <div className="section-title"><CarFront size={19}/><div><h3>Informações do veículo</h3><p>Dados usados no estoque e na integração com a OLX.</p></div></div>
          <div className="form-grid">
            <div className="span-2"><Field label="Título do anúncio"><input maxLength={90} value={v.title} onChange={e=>edit({title:e.target.value})} placeholder="Ex.: Volkswagen Polo 1.0 2024"/></Field></div>
            <Field label="Marca">{connected&&brands.length?<select value={v.brand_id} onChange={e=>{const x=brands.find(o=>o.value===e.target.value);edit({brand_id:e.target.value,brand:x?.label||'',model_id:'',version_id:'',model:'',version:''});}}><option value="">Selecione a marca</option>{brands.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input value={v.brand} onChange={e=>edit({brand:e.target.value})} placeholder="Volkswagen"/>}</Field>
            <Field label="Modelo">{connected&&models.length?<select value={v.model_id} onChange={e=>{const x=models.find(o=>o.value===e.target.value);edit({model_id:e.target.value,model:x?.label||'',version_id:'',version:''});}}><option value="">Selecione o modelo</option>{models.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input value={v.model} onChange={e=>edit({model:e.target.value})} placeholder="Polo"/>}</Field>
            <div className="span-2"><Field label="Versão">{connected&&versions.length?<select value={v.version_id} onChange={e=>{const x=versions.find(o=>o.value===e.target.value);edit({version_id:e.target.value,version:x?.label||''});}}><option value="">Selecione a versão</option>{versions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input value={v.version} onChange={e=>edit({version:e.target.value})} placeholder="1.0 MPI Flex 4p"/>}</Field></div>
            {!connected&&<div className="span-2 hint-line"><Info size={15}/> IDs oficiais são preenchidos quando a OLX estiver conectada. Sem eles, não há publicação.</div>}
            <Field label="Ano"><input type="number" min="1950" max={new Date().getFullYear()+1} value={v.year} onChange={e=>changeNum('year',e.target.value)}/></Field>
            <Field label="Quilometragem"><input type="number" min="0" value={v.mileage} onChange={e=>changeNum('mileage',e.target.value)}/></Field>
            <Field label="Preço de venda (R$)"><input type="number" min="0" value={v.price||''} onChange={e=>changeNum('price',e.target.value)} placeholder="68900"/></Field>
            <Field label="Placa do veículo"><input maxLength={7} value={v.plate} onChange={e=>edit({plate:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')})} placeholder="ABC1D23"/></Field>
            <Field label="Combustível"><select value={v.fuel} onChange={e=>edit({fuel:e.target.value})}>{FUEL_OPTIONS.map(([val,label])=><option key={val} value={val}>{label}</option>)}</select></Field>
            <Field label="Câmbio"><select value={v.gearbox} onChange={e=>edit({gearbox:e.target.value})}>{GEARBOX_OPTIONS.map(([val,label])=><option key={val} value={val}>{label}</option>)}</select></Field>
            <Field label="Telefone de contato"><input value={v.phone} onChange={e=>edit({phone:e.target.value.replace(/\D/g,'').slice(0,11)})} placeholder="4333610860" inputMode="tel"/></Field>
            <Field label="CEP real do veículo"><input value={v.zipcode} onChange={e=>edit({zipcode:e.target.value.replace(/\D/g,'').slice(0,8)})} placeholder="86000000" inputMode="numeric"/></Field>
            <Field label="Cidade do estoque"><input value={v.city} onChange={e=>edit({city:e.target.value})}/></Field>
            <Field label="UF"><input maxLength={2} value={v.state} onChange={e=>edit({state:e.target.value.toUpperCase()})}/></Field>
          </div>
        </div>}
        {section==='photos'&&<div className="form-section">
          <div className="section-title"><Camera size={19}/><div><h3>Fotos e apresentação</h3><p>A primeira imagem é a capa do anúncio.</p></div></div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>void addPhotos(e.target.files)}/>
          <button type="button" className="upload-zone" disabled={uploading||v.images.length>=20} onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void addPhotos(e.dataTransfer.files);}}>
            {uploading?<LoaderCircle size={29} className="spin"/>:<UploadCloud size={29}/>}
            <b>{uploading?'Enviando fotos...':'Clique ou arraste suas fotos aqui'}</b><span>JPG, PNG ou WEBP · Até 5 MB cada · {v.images.length}/20 fotos</span>
          </button>
          {v.images.length>0&&<div className="photo-grid">{v.images.map((src,i)=><div className="photo-tile" key={src+i}><img src={src} alt={'Foto '+(i+1)}/>{i===0&&<span className="cover-badge">CAPA</span>}<button type="button" title="Remover imagem" onClick={()=>edit({images:v.images.filter((_,idx)=>idx!==i)})}><X size={14}/></button></div>)}</div>}
          <div className="form-grid"><div className="span-2"><Field label="Descrição completa"><textarea rows={7} maxLength={6000} value={v.description} onChange={e=>edit({description:e.target.value})} placeholder="Descreva estado, diferenciais, revisões, condições de venda..."/><small>{v.description.length}/6000 caracteres</small></Field></div>
          <div className="span-2"><Field label="Vídeo no YouTube (opcional)"><input value={v.youtube_url} onChange={e=>edit({youtube_url:e.target.value})} placeholder="https://www.youtube.com/watch?v=..."/></Field></div></div>
          <div className="field-label">Opcionais</div><div className="features-grid">{FEATURE_OPTIONS.map(([value,label])=><label className="feature-check" key={value}><input type="checkbox" checked={v.features.includes(value)} onChange={()=>edit({features:v.features.includes(value)?v.features.filter(x=>x!==value):[...v.features,value]})}/><span>{label}</span></label>)}</div>
        </div>}
        {section==='cities'&&<div className="form-section"><div className="section-title"><Globe2 size={19}/><div><h3>Planejamento regional</h3><p>Até 14 cidades por veículo, sem duplicações na OLX.</p></div></div><CitySelector value={v.target_cities} onChange={cities=>edit({target_cities:cities})}/></div>}
        </div>
        {error&&<div className="modal-error"><AlertCircle size={16}/>{error}</div>}
        <div className="modal-footer"><span className="safe-note"><ShieldCheck size={15}/> Salvo de forma {cloudMode?'segura na nuvem':'local neste navegador'}</span><div><button type="button" className="btn btn-light" onClick={onClose}>Cancelar</button><button className="btn btn-primary" type="submit" disabled={saving||uploading}>{saving?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>} Salvar veículo</button></div></div>
      </form>
    </div>
  </div>;
}

function App(){
  const [page,setPage]=useState<Page>('overview');
  const [session,setSession]=useState<Session|null>(null);
  const [authReady,setAuthReady]=useState(!cloudMode);
  const [passwordRecovery,setPasswordRecovery]=useState(window.location.search.includes('reset-password=1'));
  const [olxTest,setOlxTest]=useState<{plan:string;available:number;total:number;checkedAt:string}|null>(null);
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [loading,setLoading]=useState(true);
  const [editor,setEditor]=useState<Vehicle|null>(null);
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [notice,setNotice]=useState<Notice|null>(null);
  const [connected,setConnected]=useState(false);
  const [configured,setConfigured]=useState(false);
  const [working,setWorking]=useState<string|null>(null);
  const [mobileMenu,setMobileMenu]=useState(false);
  const flash=(message:string,type:Notice['type']='success')=>{setNotice({message,type});window.setTimeout(()=>setNotice(null),6500);};
  useEffect(()=>{
    if(!supabase)return;
    void supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,current)=>{
      setSession(current);setAuthReady(true);
      if(event==='PASSWORD_RECOVERY')setPasswordRecovery(true);
    });
    return ()=>subscription.unsubscribe();
  },[]);
  const reload=useCallback(async()=>{
    setLoading(true);
    try{
      if(supabase){
        if(!session){setVehicles([]);return;}
        const {data,error}=await supabase.from('vehicles').select('*').order('created_at',{ascending:false});
        if(error)throw error;setVehicles((data||[]) as Vehicle[]);
      }else setVehicles((await getLocalVehicles()).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
    }catch(e){flash(errorText(e),'error');}finally{setLoading(false);}
  },[session]);
  useEffect(()=>{if(authReady)void reload();},[reload,authReady]);
  const connectionCheck=useCallback(async()=>{
    if(!session||!cloudMode)return;
    try{const r=await api('connection',session.access_token);setConnected(r.connected);setConfigured(r.configured);}
    catch{setConnected(false);}
  },[session]);
  useEffect(()=>{void connectionCheck();},[connectionCheck]);
  useEffect(()=>{
    const url=new URL(window.location.href), olx=url.searchParams.get('olx');
    if(olx){setNotice({type:olx==='connected'?'success':'error',message:olx==='connected'?'Conta OLX conectada com sucesso.':'Não foi possível concluir a conexão OLX: '+olx});
      url.searchParams.delete('olx');window.history.replaceState({},'',url.pathname+url.search);void connectionCheck();}
  },[connectionCheck]);
  const persist=async(v:Vehicle)=>{
    if(supabase){
      if(!session)throw new Error('Faça login novamente');
      const record={...v,user_id:session.user.id};
      const {error}=await supabase.from('vehicles').upsert(record,{onConflict:'id'});
      if(error)throw error;
    }else{
      const copy=[v,...vehicles.filter(x=>x.id!==v.id)];
      await putLocalVehicles(copy);
    }
    await reload();flash('Veículo salvo com sucesso.');
  };
  const uploadFile=async(file:File,vehicleId:string)=>{
    if(!supabase)return toDataUrl(file);
    if(!session)throw new Error('Sua sessão expirou');
    const safeName=file.name.replace(/[^a-zA-Z0-9.-]/g,'_').slice(0,80);
    const path=session.user.id+'/'+vehicleId+'/'+crypto.randomUUID()+'-'+safeName;
    const {error}=await supabase.storage.from(storageBucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    const {data}=supabase.storage.from(storageBucket).getPublicUrl(path);
    return data.publicUrl;
  };
  const removeVehicle=async(v:Vehicle)=>{
    if(v.status==='published'||v.status==='pending')return flash('Retire ou conclua o anúncio OLX antes de excluir o veículo.','error');
    if(!window.confirm('Excluir '+(v.title||'este veículo')+' do estoque?'))return;
    try{
      if(supabase){const {error}=await supabase.from('vehicles').delete().eq('id',v.id);if(error)throw error;}
      else await putLocalVehicles(vehicles.filter(x=>x.id!==v.id));
      await reload();flash('Veículo excluído.');
    }catch(e){flash(errorText(e),'error');}
  };
  const doAction=async(action:'publish'|'check'|'unpublish',v:Vehicle)=>{
    if(!session)return flash('Configure Supabase e conecte a OLX para publicar.','error');
    if(action==='publish'){
      const errors=validateVehicle(v);
      if(errors.length)return flash('Antes de publicar: '+errors.join('; '),'error');
      if(!window.confirm('Enviar UM anúncio de '+v.title+' para OLX, no CEP real '+v.zipcode+'?'))return;
    }
    if(action==='unpublish'&&!window.confirm('Solicitar retirada deste veículo da OLX?'))return;
    setWorking(v.id+action);
    try{
      const result=await api(action,session.access_token,'POST',{vehicleId:v.id});
      flash(result.message||'Operação realizada. Consulte o status.');
      await reload();
    }catch(e){flash(errorText(e),'error');}finally{setWorking(null);}
  };
  const connect=async()=>{
    if(!session)return;
    setWorking('connect');
    try{const response=await api('connect',session.access_token);window.location.assign(response.url);}
    catch(e){flash(errorText(e),'error');setWorking(null);}
  };
  const verifyOlx=async()=>{
    if(!session)return;
    setWorking('verify');setOlxTest(null);
    try{
      const result=await api('verify',session.access_token);
      setOlxTest({plan:result.plan,available:result.available,total:result.total,checkedAt:result.checkedAt});
      flash('Integração validada: a OLX confirmou o acesso à API e retornou os dados do plano.');
    }catch(e){flash('Falha no teste da OLX: '+errorText(e),'error');}
    finally{setWorking(null);}
  };
  const finishRecovery=()=>{
    setPasswordRecovery(false);
    const next=new URL(window.location.href);
    next.searchParams.delete('reset-password');
    window.history.replaceState({},'',next.pathname+next.search);
    flash('Senha alterada com sucesso. Seu acesso está liberado.');
  };
  const disconnect=async()=>{
    if(!session||!window.confirm('Desconectar OLX? Isso não retira anúncios publicados.'))return;
    try{await api('disconnect',session.access_token,'POST');setConnected(false);setOlxTest(null);flash('Conta OLX desconectada.');}
    catch(e){flash(errorText(e),'error');}
  };
  const markSold=async(v:Vehicle)=>{
    if(v.status==='published'||v.status==='pending')return flash('Solicite a retirada na OLX e confira o status antes de marcar vendido.','error');
    if(!window.confirm('Marcar o veículo como vendido?'))return;
    await persist({...v,status:'sold'});
  };
  const shown=useMemo(()=>vehicles.filter(v=>{
    const text=[v.title,v.brand,v.model,v.plate,v.city].join(' ').toLowerCase();
    return text.includes(search.toLowerCase())&&(statusFilter==='all'||v.status===statusFilter);
  }),[vehicles,search,statusFilter]);
  const published=vehicles.filter(v=>v.status==='published').length;
  const pending=vehicles.filter(v=>v.status==='pending').length;
  const total=vehicles.filter(v=>v.status!=='sold').reduce((a,v)=>a+v.price,0);
  const nav:[Page,string,React.ReactNode][]=[
    ['overview','Visão geral',<LayoutDashboard size={19}/>],
    ['vehicles','Veículos',<CarFront size={19}/>],
    ['cities','Cidades',<MapPin size={19}/>],
    ['settings','Integração OLX',<Settings2 size={19}/>]
  ];
  if(!authReady)return <div className="loading-screen"><LoaderCircle size={27} className="spin"/> Preparando sua central...</div>;
  if(!cloudMode)return <SetupScreen/>;
  if(!session||passwordRecovery)return <AuthScreen recovery={passwordRecovery} onRecovered={finishRecovery}/>;
  return <div className="app-shell">
    <aside className={'sidebar '+(mobileMenu?'mobile-open':'')}>
      <div className="brand sidebar-brand"><BrandLogo/><small className="brand-tagline">CENTRAL DE ANÚNCIOS</small></div>
      <div className="sidebar-label">MENU PRINCIPAL</div>
      <nav className="side-nav">{nav.map(([key,label,icon])=><button key={key} className={page===key?'active':''} onClick={()=>{setPage(key);setMobileMenu(false);}}>{icon}<span>{label}</span>{page===key&&<ChevronRight size={15} className="nav-chevron"/>}</button>)}</nav>
      <div className="sidebar-grow"/>
      <div className="sidebar-bottom"><div className="sidebar-integration"><span className={'status-lamp '+(connected?'online':'')}/><div><b>{connected?'OLX conectada':'OLX não conectada'}</b><small>{connected?'Pronta para integração':'Aguardando autorização'}</small></div></div><div className="sidebar-user"><span className="avatar">SC</span><div><b>Shopping Car</b><small>{session?.user.email||'Painel de operação'}</small></div>{session&&<button className="icon-btn" title="Sair" onClick={()=>void supabase?.auth.signOut()}><LogOut size={17}/></button>}</div></div>
    </aside>
    {mobileMenu&&<div className="sidebar-scrim" onClick={()=>setMobileMenu(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu icon-btn" onClick={()=>setMobileMenu(true)}><Menu size={21}/></button><span className="top-logo"><BrandLogo compact/></span><ChevronRight size={14}/><strong>{nav.find(n=>n[0]===page)?.[1]}</strong></div><div className="top-actions"><span className={'top-mode '+(connected?'connected':'')}>{connected?<Wifi size={15}/>:<CloudOff size={15}/>} {connected?'OLX conectada':cloudMode?'Conectar OLX':'Modo local'}</span><span className="top-avatar">SC</span></div></header>
      <div className="main-content">
        {notice&&<div className={'toast toast-'+notice.type}><span>{notice.type==='success'?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>}</span><p>{notice.message}</p><button onClick={()=>setNotice(null)} aria-label="Dispensar"><X size={16}/></button></div>}
        {page==='overview'&&<>
          <div className="heading-row"><div><span className="eyebrow">PAINEL OPERACIONAL</span><h1>Visão geral <span className="heading-dot">.</span></h1><p>Acompanhe o estoque e o status dos anúncios em um só lugar.</p></div><button className="btn btn-primary" onClick={()=>setEditor(newVehicle())}><Plus size={18}/> Novo veículo</button></div>
          {!cloudMode&&<div className="demo-banner"><Info size={18}/><span><b>Modo demonstração:</b> os dados ficam neste navegador. Para publicar na OLX, configure Supabase e conecte uma conta profissional autorizada.</span><button onClick={()=>setPage('settings')}>Configurar <ChevronRight size={15}/></button></div>}
          <div className="stats-grid">
            <div className="stat-card"><span className="stat-label">Veículos cadastrados <span className="stat-icon"><CarFront size={19}/></span></span><strong>{number(vehicles.length)}</strong><span className="stat-foot"><span className="small-dot blue"/> Estoque centralizado</span></div>
            <div className="stat-card"><span className="stat-label">Anúncios publicados <span className="stat-icon green-icon"><CheckCircle2 size={19}/></span></span><strong>{number(published)}</strong><span className="stat-foot"><span className="small-dot green"/> Confirmados pela OLX</span></div>
            <div className="stat-card"><span className="stat-label">Em análise <span className="stat-icon amber-icon"><RefreshCw size={19}/></span></span><strong>{number(pending)}</strong><span className="stat-foot"><span className="small-dot amber"/> Aguardando status</span></div>
            <div className="stat-card"><span className="stat-label">Valor em estoque <span className="stat-icon"><ArrowUpRight size={19}/></span></span><strong className="stat-money">{money(total)}</strong><span className="stat-foot">Exclui veículos vendidos</span></div>
          </div>
          <div className="overview-grid"><section className="panel inventory-panel"><div className="panel-title"><div><h2>Veículos recentes</h2><p>Últimos itens cadastrados no estoque</p></div><button className="text-action" onClick={()=>setPage('vehicles')}>Ver todos <ArrowUpRight size={16}/></button></div><VehicleRows vehicles={vehicles.slice(0,5)} onEdit={setEditor} emptyAction={()=>setEditor(newVehicle())}/></section>
          <section className="panel quick-panel"><div className="panel-title"><div><h2>Central de integração</h2><p>Status da operação OLX</p></div><Link2 size={18}/></div><div className="integration-art"><div className="integration-logo"><span>olx</span></div><div><b>{connected?'Integração ativa':'Sua conta OLX em um só lugar'}</b><p>{connected?'Consulte e publique seus veículos com segurança.':'Conecte a conta empresarial para liberar o catálogo e publicação.'}</p></div></div><div className="integration-checks"><div><CheckCircle2 size={17}/> Gestão de anúncios e preços</div><div><CheckCircle2 size={17}/> Acompanhamento de aprovação</div><div><ShieldCheck size={17}/> Proteção contra duplicação</div></div><button className="btn btn-outline btn-wide" onClick={()=>setPage('settings')}>{connected?'Abrir configurações':'Configurar integração'} <ArrowUpRight size={16}/></button></section></div>
          <div className="compliance-strip"><ShieldCheck size={19}/><p><b>Publicação responsável.</b> Até 14 cidades podem ser salvas para estratégia comercial. O envio pela API utiliza somente a localização real do veículo e um anúncio principal por oferta.</p></div>
        </>}
        {page==='vehicles'&&<>
          <div className="heading-row"><div><span className="eyebrow">CONTROLE DE ESTOQUE</span><h1>Meus veículos <span className="heading-dot">.</span></h1><p>Cadastre, edite e acompanhe seus anúncios sem retrabalho.</p></div><button className="btn btn-primary" onClick={()=>setEditor(newVehicle())}><Plus size={18}/> Novo veículo</button></div>
          <section className="panel list-panel"><div className="table-toolbar"><div className="search-inner large"><Search size={18}/><input placeholder="Buscar por modelo, placa, cidade..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="filter-select"><SlidersHorizontal size={17}/><select aria-label="Status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Todos os status</option>{Object.entries(statusText).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><ChevronDown size={15}/></div></div>
            {shown.length===0?<EmptyStock onAdd={()=>setEditor(newVehicle())} filtered={Boolean(search)||statusFilter!=='all'}/>:<div className="vehicle-grid">{shown.map(v=><article key={v.id} className="vehicle-card"><div className="vehicle-cover">{v.images[0]?<img src={v.images[0]} alt={v.title}/>:<div className="vehicle-placeholder"><CarFront size={36}/></div>}<span className="photo-count"><Camera size={14}/> {v.images.length}</span></div><div className="vehicle-content"><div className="vehicle-content-top"><Pill status={v.status}/><button className="icon-btn" title="Editar" onClick={()=>setEditor(v)}><Settings2 size={17}/></button></div><h3>{v.title||[v.brand,v.model].filter(Boolean).join(' ')||'Veículo sem título'}</h3><p>{v.year} · {number(v.mileage)} km · {v.city}/{v.state}</p><strong>{money(v.price)}</strong><div className="city-mini"><MapPin size={14}/>{v.target_cities.length} de 14 cidades de interesse</div></div><div className="vehicle-actions"><button className="btn btn-light" onClick={()=>setEditor(v)}>Editar</button>{connected&&(v.status==='pending'?<button className="btn btn-outline" disabled={Boolean(working)} onClick={()=>void doAction('check',v)}><RefreshCw size={15}/> Consultar</button>:v.status==='published'?<button className="btn btn-outline" disabled={Boolean(working)} onClick={()=>void doAction('unpublish',v)}>Retirar OLX</button>:v.status!=='sold'?<button className="btn btn-dark" disabled={Boolean(working)} onClick={()=>void doAction('publish',v)}><Send size={15}/> Publicar</button>:null)}{v.olx_url&&<a href={v.olx_url} target="_blank" rel="noopener noreferrer" className="btn icon-link" title="Ver OLX"><ExternalLink size={16}/></a>}</div>{v.last_error&&<div className="card-error"><AlertCircle size={15}/>{v.last_error}</div>}<div className="card-footer"><button onClick={()=>void removeVehicle(v)}><Trash2 size={14}/> Excluir</button>{v.status!=='sold'&&<button onClick={()=>void markSold(v)}>Marcar vendido</button>}</div></article>)}</div>}
          </section>
        </>}
        {page==='cities'&&<>
          <div className="heading-row"><div><span className="eyebrow">EXPANSÃO REGIONAL</span><h1>Cidades estratégicas <span className="heading-dot">.</span></h1><p>Visualize os mercados escolhidos para divulgação de cada veículo.</p></div></div>
          <div className="demo-banner soft"><Info size={18}/><span><b>Planejamento, não replicação.</b> Selecionar 14 cidades não significa publicar 14 anúncios: a OLX não permite anúncios idênticos em várias regiões.</span></div>
          <div className="cities-stats"><span><Globe2 size={22}/></span><div><strong>{new Set(vehicles.flatMap(v=>v.target_cities.map(c=>c.name+'-'+c.state))).size}</strong><p>cidades únicas presentes no planejamento</p></div></div>
          <section className="panel city-list"><div className="panel-title"><div><h2>Veículos e regiões</h2><p>Escolha um veículo para ajustar suas cidades</p></div></div>{vehicles.length===0?<EmptyStock onAdd={()=>setEditor(newVehicle())}/>:vehicles.map(v=><div className="city-list-row" key={v.id}><div><b>{v.title||v.brand+' '+v.model||'Sem título'}</b><small>{v.target_cities.length}/14 cidades selecionadas</small><div className="mini-chips">{v.target_cities.slice(0,7).map(c=><span key={c.name+c.state}>{c.name} / {c.state}</span>)}{v.target_cities.length>7&&<span>+{v.target_cities.length-7} cidades</span>}</div></div><button className="btn btn-light" onClick={()=>setEditor(v)}>Gerenciar <ArrowUpRight size={15}/></button></div>)}</section>
        </>}
        {page==='settings'&&<>
          <div className="heading-row"><div><span className="eyebrow">CONFIGURAÇÃO E ACESSO</span><h1>Integração OLX <span className="heading-dot">.</span></h1><p>Conexão segura com sua conta profissional.</p></div></div>
          <div className="settings-grid"><section className="panel settings-main"><div className="settings-logo">olx</div><h2>{connected?'Sua conta está conectada':'Conecte sua conta empresarial'}</h2><p>A autenticação acontece no ambiente oficial da OLX. Suas credenciais de acesso não são solicitadas pelo nosso painel.</p><div className={'connection-status '+(connected?'yes':'')}><span className={'status-lamp '+(connected?'online':'')}/>{connected?'Integração conectada':'Integração desconectada'}</div>
            {!cloudMode?<div className="inline-alert"><CloudOff size={17}/> Configure Supabase e publique no Vercel para habilitar a conexão oficial.</div>:!configured?<div className="inline-alert"><AlertCircle size={17}/> Credenciais OLX ainda não cadastradas no backend Vercel.</div>:null}
            {connected?<div className="integration-actions">
              <div className="connection-test">
                <div className="connection-test-heading"><div className="test-icon"><ShieldCheck size={20}/></div><div><b>Validar acesso à API OLX</b><p>Consulta seu plano e saldo de anúncios sem publicar nada.</p></div></div>
                {olxTest&&<div className="test-success"><CheckCircle2 size={17}/><span><b>Integração validada!</b><small>{olxTest.plan} · {olxTest.available} de {olxTest.total} inserções disponíveis</small><small>Verificado em {new Date(olxTest.checkedAt).toLocaleString('pt-BR')}</small></span></div>}
                <button className="btn btn-primary btn-wide" onClick={()=>void verifyOlx()} disabled={Boolean(working)}>{working==='verify'?<LoaderCircle size={17} className="spin"/>:<ShieldCheck size={17}/>} {working==='verify'?'Verificando conexão...':'Testar conexão com a OLX'}</button>
              </div>
              <div className="button-row"><button className="btn btn-light" onClick={()=>void connectionCheck()}><RefreshCw size={17}/> Atualizar status</button><button className="btn btn-outline" onClick={()=>void disconnect()}>Desconectar</button></div>
            </div>:<div className="integration-actions"><div className="connection-flow">
                <div><span>01</span><p><b>Login Shopping Car</b><small>Você já está conectado ao portal.</small></p><CheckCircle2 size={18}/></div>
                <div><span>02</span><p><b>Autorizar na OLX</b><small>Você será redirecionado para auth.olx.com.br.</small></p><ArrowUpRight size={17}/></div>
                <div><span>03</span><p><b>Validar conexão</b><small>Depois, consulte o saldo da conta sem publicar.</small></p><ShieldCheck size={17}/></div>
              </div><button className="btn btn-primary btn-wide" onClick={()=>void connect()} disabled={!cloudMode||!configured||Boolean(working)}><Link2 size={17}/> Conectar conta na OLX <ArrowUpRight size={16}/></button></div>}
          </section><section className="panel settings-checklist"><h3>O que você precisa</h3><div className="checklist"><div><CheckCircle2 size={18}/><span>Plano profissional OLX compatível com API</span></div><div><CheckCircle2 size={18}/><span>Aplicação cadastrada e autorização autoupload</span></div><div><CheckCircle2 size={18}/><span>Supabase e ambiente de produção configurados</span></div><div><CheckCircle2 size={18}/><span>Fotos públicas e dados oficiais do veículo</span></div></div><a className="documentation-link" href="https://developers.olx.com.br/anuncio/api/home.html" target="_blank" rel="noopener noreferrer"><ClipboardList size={17}/> Documentação oficial <ExternalLink size={15}/></a></section></div>
          <div className="panel policy-panel"><ShieldCheck size={23}/><div><h3>14 cidades: um planejamento, não 14 anúncios iguais</h3><p>O sistema foi projetado para permitir a seleção de regiões estratégicas, mas só envia um anúncio por veículo usando o CEP real. A publicação duplicada em diferentes cidades está bloqueada em respeito às regras da OLX.</p></div></div>
        </>}
      </div>
    </main>
    {editor&&<VehicleEditor key={editor.id} initial={editor} onClose={()=>setEditor(null)} onSave={persist} uploadFile={uploadFile} connected={connected}/>}
  </div>;
}

function EmptyStock({onAdd,filtered=false}:{onAdd:()=>void;filtered?:boolean}){
  return <div className="empty-stock"><span><ImagePlus size={31}/></span><h3>{filtered?'Nenhum resultado encontrado':'Sua central está pronta para começar'}</h3><p>{filtered?'Tente outra busca ou filtro.':'Cadastre o primeiro veículo com fotos, dados e descrição. Tudo organizado em um só lugar.'}</p>{!filtered&&<button className="btn btn-primary" onClick={onAdd}><Plus size={17}/> Cadastrar veículo</button>}</div>;
}
function VehicleRows({vehicles,onEdit,emptyAction}:{vehicles:Vehicle[];onEdit:(v:Vehicle)=>void;emptyAction:()=>void}){
  if(!vehicles.length)return <EmptyStock onAdd={emptyAction}/>;
  return <div className="recent-list">{vehicles.map(v=><button className="recent-item" key={v.id} onClick={()=>onEdit(v)}><span className="recent-thumb">{v.images[0]?<img src={v.images[0]} alt=""/>:<CarFront size={20}/>}</span><span className="recent-name"><b>{v.title||[v.brand,v.model].join(' ')||'Sem título'}</b><small>{v.year} · {number(v.mileage)} km</small></span><span className="recent-price">{money(v.price)}<Pill status={v.status}/></span><ChevronRight size={18}/></button>)}</div>;
}
export default App;

import { createClient } from '@supabase/supabase-js';

export type City = { name: string; state: string; zip?: string };
export type VehicleStatus = 'draft' | 'pending' | 'published' | 'refused' | 'sold' | 'removed';
export type Vehicle = {
  id: string;
  user_id?: string;
  ad_id: string;
  title: string;
  brand: string;
  model: string;
  version: string;
  brand_id: string;
  model_id: string;
  version_id: string;
  year: number;
  mileage: number;
  price: number;
  phone: string;
  zipcode: string;
  city: string;
  state: string;
  plate: string;
  fuel: string;
  gearbox: string;
  color: string;
  doors: string;
  description: string;
  youtube_url: string;
  images: string[];
  target_cities: City[];
  features: string[];
  status: VehicleStatus;
  import_token: string | null;
  olx_list_id: string | null;
  olx_url: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};
export const storageBucket = 'olx-vehicle-images';
// URL e publishable key são públicas; fallback mantém o portal operante
// mesmo quando as variáveis VITE_ não foram configuradas na Vercel.
// Variáveis de ambiente corretas continuam tendo precedência.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  || 'https://jmrcvfrpwrehdaynabgb.supabase.co';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  || 'sb_publishable__1MdzyomyDH3cR2ab3oBLw_anwjIV7G';
export const cloudMode = Boolean(url && anon);
export const supabase = cloudMode ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const CITY_OPTIONS: City[] = [
  {name:'Londrina', state:'PR'}, {name:'Cambé',state:'PR'}, {name:'Rolândia',state:'PR'},
  {name:'Ibiporã',state:'PR'}, {name:'Arapongas',state:'PR'}, {name:'Apucarana',state:'PR'},
  {name:'Cambira',state:'PR'}, {name:'Jataizinho',state:'PR'}, {name:'Sertanópolis',state:'PR'},
  {name:'Bela Vista do Paraíso',state:'PR'}, {name:'Cornélio Procópio',state:'PR'},
  {name:'Bandeirantes',state:'PR'}, {name:'Jacarezinho',state:'PR'}, {name:'Santo Antônio da Platina',state:'PR'},
  {name:'Assaí',state:'PR'}, {name:'Uraí',state:'PR'}, {name:'Maringá',state:'PR'},
  {name:'Sarandi',state:'PR'}, {name:'Mandaguari',state:'PR'}, {name:'Paiçandu',state:'PR'},
  {name:'Jandaia do Sul',state:'PR'}, {name:'Campo Mourão',state:'PR'}, {name:'Cascavel',state:'PR'},
  {name:'Toledo',state:'PR'}, {name:'Ponta Grossa',state:'PR'}, {name:'Curitiba',state:'PR'},
  {name:'Ourinhos',state:'SP'}, {name:'Assis',state:'SP'}, {name:'Presidente Prudente',state:'SP'},
  {name:'Três Lagoas',state:'MS'}, {name:'São Paulo',state:'SP'}, {name:'Campinas',state:'SP'}
];
export const FEATURE_OPTIONS: [string,string][] = [
  ['1','Ar-condicionado'],['3','Vidros elétricos'],['4','Travas elétricas'],
  ['5','Airbag'],['6','Alarme'],['7','Som'],['8','Sensor de ré'],
  ['9','Câmera de ré'],['11','Bancos de couro'],['12','Computador de bordo'],
  ['14','Volante multifuncional'],['15','Bluetooth'],['18','Rodas de liga leve'],
  ['19','Teto solar'],['20','Tração 4x4']
];
export const FUEL_OPTIONS = [
  ['','Selecione'],['1','Gasolina'],['2','Etanol'],['3','Flex'],
  ['5','Diesel'],['6','Híbrido'],['7','Elétrico']
];
export const GEARBOX_OPTIONS = [
  ['','Selecione'],['1','Manual'],['2','Automático'],
  ['3','Semiautomático'],['4','Automatizado']
];
export function newVehicle(): Vehicle {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), ad_id: 'SC' + crypto.randomUUID().replace(/-/g,'').slice(0,14).toUpperCase(),
    title:'', brand:'', model:'', version:'', brand_id:'', model_id:'', version_id:'',
    year: new Date().getFullYear(), mileage:0, price:0, phone:'',
    zipcode:'',city:'Londrina',state:'PR',plate:'',fuel:'',gearbox:'',color:'',doors:'',
    description:'',youtube_url:'',images:[],target_cities:[],features:[],
    status:'draft',import_token:null,olx_list_id:null,olx_url:null,last_error:null,
    created_at:now,updated_at:now
  };
}
export function money(value:number):string {
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value||0);
}
export function number(value:number):string {
  return new Intl.NumberFormat('pt-BR').format(value||0);
}
export function errorText(err:unknown):string {
  return err instanceof Error ? err.message : typeof err === 'string' ? err : 'Ocorreu um erro inesperado';
}
export async function toDataUrl(file:File):Promise<string> {
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new Error('Não foi possível ler a foto'));
    reader.readAsDataURL(file);
  });
}
const databaseName='shoppingcar-olx-data';
function openLocalDb():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(databaseName,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('state')) db.createObjectStore('state');
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
export async function getLocalVehicles():Promise<Vehicle[]> {
  const db=await openLocalDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('state','readonly'), req=tx.objectStore('state').get('vehicles');
    req.onsuccess=()=>{resolve(Array.isArray(req.result)?req.result as Vehicle[]:[]); db.close();};
    req.onerror=()=>{reject(req.error); db.close();};
  });
}
export async function putLocalVehicles(vehicles:Vehicle[]):Promise<void> {
  const db=await openLocalDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('state','readwrite');
    tx.objectStore('state').put(vehicles,'vehicles');
    tx.oncomplete=()=>{resolve();db.close();};
    tx.onerror=()=>{reject(tx.error);db.close();};
  });
}
export function validateVehicle(vehicle:Vehicle):string[] {
  const errors:string[]=[];
  if(vehicle.title.trim().length<2 || vehicle.title.length>90) errors.push('Título: use de 2 a 90 caracteres');
  if(vehicle.description.trim().length<2 || vehicle.description.length>6000) errors.push('Descrição: use de 2 a 6.000 caracteres');
  if(!Number.isFinite(vehicle.price)||vehicle.price<=0) errors.push('Informe um preço válido');
  if(!/^\d{8}$/.test(vehicle.zipcode.replace(/\D/g,''))) errors.push('Informe o CEP real do estoque com 8 dígitos');
  if(!/^\d{10,11}$/.test(vehicle.phone.replace(/\D/g,''))) errors.push('Telefone deve conter DDD + número');
  if(!Number.isInteger(vehicle.year)||vehicle.year<1950) errors.push('Informe um ano válido');
  if(!Number.isFinite(vehicle.mileage)||vehicle.mileage<0) errors.push('Quilometragem inválida');
  if(!vehicle.brand_id||!vehicle.model_id||!vehicle.version_id) errors.push('Selecione marca, modelo e versão do catálogo oficial OLX');
  if(!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(vehicle.plate.toUpperCase().replace(/[^A-Z0-9]/g,''))) errors.push('Informe a placa válida do veículo usado');
  if(vehicle.images.length<1 || vehicle.images.length>20) errors.push('Adicione de 1 a 20 fotos');
  if(vehicle.images.some(src=>!/^https:\/\//i.test(src))) errors.push('Para a API, as fotos devem ter URLs HTTPS públicas (modo nuvem)');
  if(vehicle.target_cities.length>14) errors.push('Selecione no máximo 14 cidades comerciais');
  return errors;
}
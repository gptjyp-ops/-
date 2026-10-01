import {GET as list,POST as save} from './records';import {GET as photo} from './photos';
export default {async fetch(request:Request,env:Cloudflare.Env):Promise<Response>{
const url=new URL(request.url),origin=request.headers.get('Origin');const allowed=origin===url.origin||(env.FRONTEND_ORIGIN&&origin===env.FRONTEND_ORIGIN);
if(url.pathname.startsWith('/api/')&&origin&&!allowed)return new Response('Forbidden',{status:403});let response:Response;
if(request.method==='OPTIONS')response=new Response(null,{status:204});
else if(url.pathname==='/api/records')response=request.method==='GET'?await list():request.method==='POST'?await save(request):new Response('Method not allowed',{status:405});
else if(url.pathname.startsWith('/api/photos/')&&request.method==='GET')response=await photo(request,{params:Promise.resolve({key:url.pathname.slice('/api/photos/'.length)})});
else if(url.pathname.startsWith('/api/'))response=new Response('Not found',{status:404});else return env.ASSETS.fetch(request);
const headers=new Headers(response.headers);if(allowed&&origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');}headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');return new Response(response.body,{status:response.status,headers});}};

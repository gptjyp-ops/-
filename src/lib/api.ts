export const apiUrl=(path:string)=>(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'')+path;

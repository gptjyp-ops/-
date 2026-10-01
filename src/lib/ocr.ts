export const labels=['탈것','알','스킬포인트'];
export function parseNumber(s:string):number|null{const m=s.replace(/,/g,'').match(/^(\d+(?:\.\d+)?)\s*(만|천|억|[kKmMbB])?$/);if(!m)return null;const units:Record<string,number>={'만':10000,'천':1000,'억':100000000,k:1000,m:1000000,b:1000000000};const n=Math.round(Number(m[1])*(units[(m[2]||'').toLowerCase()]||1));return Number.isSafeInteger(n)&&n<=1e12?n:null;}
export function extract(text:string){
 const result:(number|null)[]=[null,null,null];const candidates:number[]=[];
 for(const line of text.split('\n')){const hits=line.match(/\d[\d,]*(?:\.\d+)?\s*(?:만|천|억|[kKmMbB])?/g)||[];const nums=hits.map(s=>parseNumber(s.trim())).filter((n):n is number=>n!==null);for(const n of nums)if(!candidates.includes(n))candidates.push(n);
 const i=/탈것|mount/i.test(line)?0:/(?:^|\s)알(?:\s|$)|egg/i.test(line)?1:/스킬|skill/i.test(line)?2:-1;if(i>=0&&nums.length===1)result[i]=nums[0];}
 return {result,candidates:candidates.slice(0,40)};
}

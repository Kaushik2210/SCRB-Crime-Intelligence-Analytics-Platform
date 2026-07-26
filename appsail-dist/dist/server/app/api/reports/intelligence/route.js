"use strict";(()=>{var e={};e.id=751,e.ids=[751],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},84770:e=>{e.exports=require("crypto")},17702:e=>{e.exports=require("events")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},86624:e=>{e.exports=require("querystring")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},92761:e=>{e.exports=require("node:async_hooks")},79536:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>$,patchFetch:()=>y,requestAsyncStorage:()=>x,routeModule:()=>b,serverHooks:()=>v,staticGenerationAsyncStorage:()=>D});var i={};r.r(i),r.d(i,{GET:()=>f});var a=r(49303),s=r(88716),n=r(60670),o=r(87070),l=r(61279),d=r(59127);function p(e){return String(e??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}let c=`
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1f2e; margin: 0; padding: 0 8px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #d8dce6; padding-bottom: 4px; }
  .meta { font-size: 11px; color: #5a6478; margin-bottom: 16px; }
  .kpi-row { display: flex; gap: 12px; margin-bottom: 8px; }
  .kpi { flex: 1; border: 1px solid #d8dce6; border-radius: 6px; padding: 10px 12px; }
  .kpi .label { font-size: 10px; color: #5a6478; text-transform: uppercase; letter-spacing: 0.03em; }
  .kpi .value { font-size: 20px; font-weight: 600; margin-top: 2px; }
  .summary { font-size: 12px; line-height: 1.6; background: #f4f6fb; border-radius: 6px; padding: 12px 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e4e7ee; }
  th { color: #5a6478; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.03em; }
  .tier-badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
  .tier-5, .tier-4 { background: #fde2e2; color: #9c1f1f; }
  .tier-3 { background: #fdf1d6; color: #8a5a00; }
  .tier-1, .tier-2 { background: #dff3e6; color: #1b6b3a; }
  body { padding: 24px 32px; max-width: 900px; margin: 0 auto; }
  .print-bar { position: sticky; top: 0; background: #fff; padding: 8px 0 12px; margin-bottom: 8px; display: flex; justify-content: flex-end; }
  .print-btn { font: 600 12px "Segoe UI", Arial, sans-serif; background: #0059e9; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
  @media print { .print-bar { display: none; } body { padding: 0; } }
`;var u=r(95362);async function m(e){let t=[];for await(let r of e)t.push(Buffer.isBuffer(r)?r:Buffer.from(r));return Buffer.concat(t)}async function g(e){let t=(0,u.us)().smartbrowz();return m(await t.convertToPdf(e,{pdf_options:{format:"A4",print_background:!0,margin:{top:"16mm",bottom:"16mm",left:"12mm",right:"12mm"}},navigation_options:{wait_until:"domcontentloaded"}}))}var h=r(67982);async function f(){let e=await (0,l.x)();if(!e)return o.NextResponse.json({error:"Unauthorized"},{status:401});let t=await (0,d.a)(e),{riskTiles:r,anomalies:i}=t,a=function({session:e,summary:t,riskTiles:r,anomalies:i}){let a=new Date().toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}),s=e.isStateLevel?"Statewide":e.districtName??"District",n=r.slice(0,15);return`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${c}</style></head>
<body>
  <div class="print-bar"><button class="print-btn" onclick="window.print()">Print / Save as PDF</button></div>
  <h1>SCRB Crime Intelligence Report</h1>
  <p class="meta">${p(s)} \xb7 Generated ${p(a)} by ${p(e.name)} (${p(e.designationName)})</p>

  <div class="kpi-row">
    <div class="kpi"><div class="label">Total cases in scope</div><div class="value">${t.totalCases}</div></div>
    <div class="kpi"><div class="label">Cases, last 90 days</div><div class="value">${t.recentCases}</div></div>
    <div class="kpi"><div class="label">Active hotspots</div><div class="value">${t.hotspotCount}</div></div>
    <div class="kpi"><div class="label">Trend anomalies</div><div class="value">${t.anomalyCount}</div></div>
  </div>

  <h2>Strategic summary</h2>
  <p class="summary">${p(t.strategicSummary)}</p>

  ${i.length>0?`<h2>Anomaly callouts</h2>
  <table>
    <thead><tr><th>Unit</th><th>District</th><th>Detail</th></tr></thead>
    <tbody>
      ${i.slice(0,12).map(e=>`<tr><td>${p(e.unitName)}</td><td>${p(e.districtName??"—")}</td><td>${p(e.message)}</td></tr>`).join("")}
    </tbody>
  </table>`:""}

  <h2>Top crime categories, last 90 days</h2>
  <table>
    <thead><tr><th>Category</th><th>Cases</th></tr></thead>
    <tbody>
      ${t.topCategories.map(e=>`<tr><td>${p(e.name)}</td><td>${e.count}</td></tr>`).join("")}
    </tbody>
  </table>

  <h2>Predictive risk tiles</h2>
  <table>
    <thead><tr><th>Unit</th><th>District</th><th>Category</th><th>Recent</th><th>Typical</th><th>Forecast next qtr</th><th>Tier</th></tr></thead>
    <tbody>
      ${n.map(e=>`<tr>
              <td>${p(e.unitName)}</td>
              <td>${p(e.districtName??"—")}</td>
              <td>${p(e.crimeSubHeadName)}</td>
              <td>${e.recentCount}</td>
              <td>${e.baselineAvgPer90}</td>
              <td>${e.predictedNextCount??"—"}</td>
              <td><span class="tier-badge tier-${e.tier}">Tier ${e.tier}</span></td>
            </tr>`).join("")}
    </tbody>
  </table>
</body>
</html>`}({session:e,summary:t,riskTiles:r,anomalies:i});if(!(0,h.s6)())try{let e=await g(a),t=`scrb-intelligence-report-${new Date().toISOString().slice(0,10)}.pdf`;return new o.NextResponse(e,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${t}"`}})}catch(e){console.warn("SmartBrowz PDF generation unavailable, serving HTML report instead:",e?.message??e)}return new o.NextResponse(a,{status:200,headers:{"Content-Type":"text/html; charset=utf-8"}})}let b=new a.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/reports/intelligence/route",pathname:"/api/reports/intelligence",filename:"route",bundlePath:"app/api/reports/intelligence/route"},resolvedPagePath:"C:\\Users\\Kaushik\\OneDrive\\Desktop\\Datathon_AI-Driven_Crime_Mgt\\app\\api\\reports\\intelligence\\route.js",nextConfigOutput:"standalone",userland:i}),{requestAsyncStorage:x,staticGenerationAsyncStorage:D,serverHooks:v}=b,$="/api/reports/intelligence/route";function y(){return(0,n.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:D})}},59127:(e,t,r)=>{r.d(t,{a:()=>c});var i=r(33416),a=r(89457),s=r(64262),n=r(2996),o=r(68247),l=r(71442),d=r(3173);async function p(e){let t=await (0,i.o)((0,l.F)("CaseMaster",e),"CaseMaster");return(0,l.b)(t)}async function c(e){let t=(0,a.e3)(e),r=new Date,l=new Date(r);l.setDate(l.getDate()-90);let c=new Date(r);c.setDate(c.getDate()-180);let[g,h,f,b]=await Promise.all([p(t),p(`${t} AND CrimeRegisteredDate >= '${(0,o.b)(l)}'`),p(`${t} AND CrimeRegisteredDate >= '${(0,o.b)(c)}' AND CrimeRegisteredDate < '${(0,o.b)(l)}'`),(0,s.Ub)(t)]),x=(0,s.rp)(b),D=0===f?0:Math.round((h-f)/f*100),v=b.filter(e=>e.tier>=4).length,$=[],y={lat:15.3173,lng:75.7139,zoom:6.2};if(e.isStateLevel){let[e,r,a]=await Promise.all([(0,i.o)(`SELECT PoliceStationID FROM CaseMaster WHERE ${t}`,"CaseMaster"),(0,n.rY)(),(0,n.Wf)()]),s=new Map(r.map(e=>[e.UnitID,e.DistrictID])),o=new Map;for(let t of e){let e=s.get(t.PoliceStationID);null!=e&&o.set(e,(o.get(e)??0)+1)}$=a.filter(e=>o.has(e.DistrictID)).map(e=>({id:e.DistrictID,lat:e.CentroidLat,lng:e.CentroidLng,weight:o.get(e.DistrictID)??0,label:`${e.DistrictName}: ${o.get(e.DistrictID)} cases`,colorVar:"--chart-4"}))}else if(null!=e.districtId){let[r,a,s]=await Promise.all([(0,n.Wf)(),(0,n.rY)(),(0,i.o)(`SELECT PoliceStationID FROM CaseMaster WHERE ${t}`,"CaseMaster")]),o=r.find(t=>(0,d.bJ)(t.DistrictID,e.districtId));o&&(y={lat:o.CentroidLat,lng:o.CentroidLng,zoom:9.5});let l=a.filter(t=>(0,d.bJ)(t.DistrictID,e.districtId)),p=new Map;for(let e of s)p.set(e.PoliceStationID,(p.get(e.PoliceStationID)??0)+1);$=l.filter(e=>p.has(e.UnitID)&&null!=e.Latitude&&null!=e.Longitude).map(e=>({id:e.UnitID,lat:e.Latitude,lng:e.Longitude,weight:p.get(e.UnitID)??0,label:`${e.UnitName}: ${p.get(e.UnitID)} cases`,colorVar:"--chart-2"}))}let[C,w]=await Promise.all([u(t),m(t,l)]),S=e.isStateLevel?`Statewide, ${h} cases were registered in the last 90 days across ${$.length} districts (${D>=0?"+":""}${D}% vs. the prior period). ${v} localities show elevated risk and ${x.length} categories are trending above their historical baseline.`:`${e.districtName} registered ${h} cases in the last 90 days (${D>=0?"+":""}${D}% vs. the prior period), with ${v} station/category combinations showing elevated risk.`;return{totalCases:g,recentCases:h,trendPct:D,hotspotCount:v,anomalyCount:x.length,mapPoints:$,mapCenter:y,strategicSummary:S,trendSeries:C,topCategories:w,riskTiles:b,anomalies:x}}async function u(e){let t=new Date;t.setDate(t.getDate()-84);let r=await (0,i.o)(`SELECT CrimeRegisteredDate FROM CaseMaster WHERE ${e} AND CrimeRegisteredDate >= '${(0,o.b)(t)}'`,"CaseMaster"),a=Date.now(),s=Array.from({length:12},()=>0);for(let e of r){let t=11-Math.floor((a-new Date(e.CrimeRegisteredDate).getTime())/864e5/7);t>=0&&t<12&&s[t]++}return s.map((e,t)=>({week:`W${t+1}`,count:e}))}async function m(e,t){let[r,a]=await Promise.all([(0,i.o)(`SELECT CrimeMinorHeadID FROM CaseMaster WHERE ${e} AND CrimeRegisteredDate >= '${(0,o.b)(t)}'`,"CaseMaster"),(0,n.i6)()]);if(0===r.length)return[];let s=new Map;for(let e of r)s.set(e.CrimeMinorHeadID,(s.get(e.CrimeMinorHeadID)??0)+1);let l=new Map(a.map(e=>[e.CrimeSubHeadID,e.CrimeSubHeadName]));return Array.from(s.entries()).map(([e,t])=>({name:l.get(e)??"Unknown",count:t})).sort((e,t)=>t.count-e.count).slice(0,5)}},71442:(e,t,r)=>{function i(e,t){let r=t?` WHERE ${t}`:"";return`SELECT COUNT(ROWID) FROM ${e}${r}`}function a(e){return Number(e?.[0]?.["COUNT(ROWID)"]??0)}r.d(t,{F:()=>i,b:()=>a})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[948,656,12,972,999,277],()=>r(79536));module.exports=i})();
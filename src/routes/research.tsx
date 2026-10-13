import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin, getResearchData, getResearchPhoto, seedDemoSessions } from "@/lib/experiment.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/research")({ssr:false,component: ResearchPage});
type Session = Awaited<ReturnType<typeof getResearchData>>["sessions"][number];
function pct(a:number,b:number){return b ? Math.round(1000*a/b)/10 : 0;}
function mean(ns:number[]){return ns.length?(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1):"—";}
function safeCsv(s:unknown){const value=String(s??"");return '"'+( /^[=+@\-]/.test(value)?"'":"")+value.replace(/"/g,'""')+'"';}
function ResearchPage(){
 const nav=useNavigate();
 const [status,setStatus]=useState<"loading"|"unauthorized"|"ready"|"error">("loading");
 const [data,setData]=useState<Session[]>([]);
 const [photos,setPhotos]=useState<string[]>([]);
 const [showDemo,setShowDemo]=useState(false);
 const [message,setMessage]=useState("");
 const [photoUrl,setPhotoUrl]=useState<string|null>(null);
 const [photoLabel,setPhotoLabel]=useState("");
 const reload=async()=>{
   const out=await getResearchData();
   setData(out.sessions);
   setPhotos(out.photoSessionIds);
 };
 useEffect(()=>{let active=true;(async()=>{
  try{
   const {data:auth}=await supabase.auth.getSession();
   if(!auth.session){if(active)setStatus("unauthorized");return;}
   const role=await checkIsAdmin();
   if(!role.isAdmin){if(active)setStatus("unauthorized");return;}
   await reload();if(active)setStatus("ready");
  }catch(e){if(active){setMessage(e instanceof Error?e.message:"Unable to load data");setStatus("error");}}
 })();return()=>{active=false;};},[]);
 const sessions=useMemo(()=>showDemo?data:data.filter(x=>!x.is_demo),[data,showDemo]);
 const group=(g:"A"|"B")=>sessions.filter(s=>s.assigned_group===g);
 const eligible=(g:"A"|"B")=>group(g).filter(s=>s.decision_reached_at!==null);
 const continued=(g:"A"|"B")=>eligible(g).filter(s=>s.next_module_started_at!==null).length;
 const a=eligible("A"),b=eligible("B");
 const pa=pct(continued("A"),a.length),pb=pct(continued("B"),b.length);
 const exportCsv=()=>{
  const headers=["participant_code","assigned_group","is_demo","started_at","lesson_completed_at","activity_status","observation_text","parent_help","comprehension_score","meaningfulness","decision_reached_at","continuation_choice","next_module_started_at","classified_status","has_photo"];
  const lines=[headers.join(","),...sessions.map(s=>headers.map(k=>safeCsv(k==="has_photo"?photos.includes(s.id):s[k as keyof Session])).join(","))];
  const url=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="oceanx-experiment.csv";a.click();URL.revokeObjectURL(url);
 };
 const viewPhoto=async(s:Session)=>{try{const r=await getResearchPhoto({data:{sessionId:s.id}});setPhotoUrl(r.photoDataUrl);setPhotoLabel(s.participant_code||s.id.slice(0,8));}catch{setMessage("Unable to retrieve photo");}};
 if(status!=="ready")return <div className="ocean-surface min-h-screen px-6 py-20"><main className="mx-auto max-w-xl rounded-xl bg-card p-8"><h1 className="text-2xl font-bold text-ocean-deep">Research dashboard</h1><p className="mt-3 text-muted-foreground">{status==="loading"?"Checking access…":status==="unauthorized"?"Access requires a signed-in account with the admin role. Research data is not public.":message}</p><Link to="/auth" className="mt-6 inline-block text-primary underline">Researcher sign-in</Link></main></div>;
 return <div className="ocean-surface min-h-screen px-4 py-8"><main className="mx-auto max-w-6xl">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><Link to="/" className="text-sm font-semibold text-primary">← OceanX Learning Journey</Link><h1 className="mt-2 text-3xl font-bold text-ocean-deep">Research dashboard</h1></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void reload().catch(()=>setMessage("Refresh failed"))}>Refresh</Button><Button variant="outline" onClick={exportCsv}>Export CSV</Button><Button variant="outline" onClick={async()=>{await supabase.auth.signOut();void nav({to:"/auth"});}}>Sign out</Button></div></header>
 <div className="mt-5 flex flex-wrap items-center gap-3"><label className="text-sm"><input type="checkbox" checked={showDemo} onChange={e=>setShowDemo(e.target.checked)} /> Include synthetic demo records</label><Button variant="outline" size="sm" onClick={async()=>{setMessage("");try{const r=await seedDemoSessions();await reload();setShowDemo(true);setMessage("Added "+r.inserted+" synthetic records (clearly marked as demo).");}catch(e){setMessage(e instanceof Error?e.message:"Could not seed demos");}}}>Seed demo records</Button></div>
 {message&&<p role="status" className="my-3 text-sm text-primary">{message}</p>}
 <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 {([["A eligible",a.length],["A continued",continued("A")],["B eligible",b.length],["B continued",continued("B")]] as const).map(([label,n])=><div key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-bold text-ocean-deep">{n}</p></div>)}
 </section>
 <section className="mt-3 grid gap-3 sm:grid-cols-3">
 <div className="rounded-xl border bg-card p-5"><p>Group A continuation</p><p className="text-3xl font-bold">{a.length?pa+"%":"—"}</p></div>
 <div className="rounded-xl border bg-card p-5"><p>Group B continuation</p><p className="text-3xl font-bold">{b.length?pb+"%":"—"}</p></div>
 <div className="rounded-xl border bg-card p-5"><p>B minus A</p><p className="text-3xl font-bold">{a.length&&b.length?(pb-pa).toFixed(1)+" pp":"—"}</p></div>
 </section>
 <p className="mt-3 text-xs text-muted-foreground">Primary metric = sessions actually opening the next module divided by sessions reaching the decision screen. The sample is descriptive, not causal proof.</p>
 <section className="mt-7 rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">Supporting observations</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><p>Meaningfulness A/B: <strong>{mean(group("A").flatMap(s=>s.meaningfulness!==null?[s.meaningfulness]:[]))} / {mean(group("B").flatMap(s=>s.meaningfulness!==null?[s.meaningfulness]:[]))}</strong></p><p>Quiz score A/B (out of 3): <strong>{mean(group("A").flatMap(s=>s.comprehension_score!==null?[s.comprehension_score]:[]))} / {mean(group("B").flatMap(s=>s.comprehension_score!==null?[s.comprehension_score]:[]))}</strong></p><p>Activity B completed / skipped: <strong>{group("B").filter(s=>s.activity_status==="completed").length} / {group("B").filter(s=>s.activity_status==="skipped").length}</strong></p></div><p className="mt-3 text-sm text-muted-foreground">Sessions started: A {group("A").length}, B {group("B").length}. Reached decision: A {a.length}, B {b.length}. Photo submissions: {sessions.filter(s=>photos.includes(s.id)).length}. Group B parent assistance: {group("B").filter(s=>s.parent_help!==null).map(s=>s.parent_help).join(", ")||"—"}.</p></section>
 <section className="mt-7 rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">Session records</h2>{sessions.length===0?<p className="mt-3 text-sm text-muted-foreground">No participant records yet. Start the learning journey or seed synthetic data for the video demo.</p>:<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{["Participant","Group","Type","Stage","Activity","Score","Meaningfulness","Decision","Status","Photo"].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{sessions.map(s=><tr className="border-b" key={s.id}><td className="p-2">{s.participant_code||s.id.slice(0,8)}</td><td className="p-2">{s.assigned_group}</td><td className="p-2">{s.is_demo?"DEMO":"Test"}</td><td className="p-2">{s.next_module_started_at?"Next module":s.decision_reached_at?"Decision":s.quiz_completed_at?"Quiz":s.activity_completed_at?"Activity":s.lesson_completed_at?"Lesson":"Started"}</td><td className="p-2">{s.activity_status||"—"}</td><td className="p-2">{s.comprehension_score??"—"}</td><td className="p-2">{s.meaningfulness??"—"}</td><td className="p-2">{s.continuation_choice||"—"}</td><td className="p-2 font-semibold">{s.classified_status}</td><td className="p-2">{photos.includes(s.id)?<button className="text-primary underline" onClick={()=>void viewPhoto(s)}>View privately</button>:"—"}</td></tr>)}</tbody></table></div>}</section>
 {photoUrl&&<div className="mt-4 rounded-xl border bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Private photo: {photoLabel}</h2><Button size="sm" variant="outline" onClick={()=>{setPhotoUrl(null);setPhotoLabel("");}}>Close</Button></div><img src={photoUrl} alt="Submitted object-only observation" className="mt-3 max-h-80 rounded-lg object-contain" /></div>}
 <section className="my-7 rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">Two-minute walkthrough checklist</h2><ol className="mt-3 list-decimal space-y-2 pl-6"><li>Start a new learner session and note automatic Group A or B assignment.</li><li>Complete the lesson and virtual sorting interaction.</li><li>For Group B, complete the physical audit and optionally take an object-only camera photo; save the observation.</li><li>Finish the common quiz and choose “Explore the next journey”; wait for the next module to open.</li><li>Return here, refresh, and show the persisted record with automatic “Continued” classification.</li></ol><p className="mt-4 text-xs text-muted-foreground">The real-world activity adds time, and small samples cannot establish causal improvement. Obtain proper consent before testing with children.</p></section>
 </main></div>;
}

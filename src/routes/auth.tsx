import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/auth")({ssr:false,component: AuthPage});
function AuthPage(){
 const navigate=useNavigate();
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [note,setNote]=useState("");
 const submit=async(signUp:boolean)=>{
  setBusy(true);setError("");setNote("");
  try{
   const result=signUp?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   if(signUp && !result.data.session){setNote("Check your email and confirm your account before signing in.");return;}
   await navigate({to:"/research"});
  }catch(e){setError(e instanceof Error?e.message:"Could not sign in");}finally{setBusy(false);}
 };
 return <div className="ocean-surface min-h-screen p-6"><main className="mx-auto mt-16 max-w-md rounded-2xl border bg-card p-8">
 <Link to="/" className="font-semibold text-primary">← OceanX Learning Journey</Link>
 <h1 className="mt-6 text-2xl font-bold text-ocean-deep">Researcher sign-in</h1>
 <p className="mt-2 text-sm text-muted-foreground">Research data is restricted to accounts assigned the admin role. Registering alone does not grant access.</p>
 <form className="mt-6 space-y-4" onSubmit={e=>{e.preventDefault();void submit(false);}}>
 <label className="block text-sm font-semibold">Email<Input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
 <label className="block text-sm font-semibold">Password<Input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{note&&<p className="text-sm text-primary">{note}</p>}
 <div className="flex flex-wrap gap-3"><Button disabled={busy} type="submit">Sign in</Button><Button disabled={busy} type="button" variant="outline" onClick={()=>void submit(true)}>Register researcher</Button></div>
 </form><p className="mt-6 text-xs text-muted-foreground">After registration, the project owner must assign the admin role through the Supabase database. Never enter a service-role key into this form.</p>
 </main></div>;
}
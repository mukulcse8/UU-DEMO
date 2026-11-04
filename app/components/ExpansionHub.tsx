"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, Users, Plus, Search, Upload, Lock, Globe, ShieldCheck, Download, Trash2, Clock3 } from "lucide-react";

type ProfileLite = { id: string; full_name: string; student_status: string; university_id: string | null; role: string };
type Community = { id: string; name: string; description: string; community_type: "public"|"private"|"hidden"; category: string; created_by: string; join_approval: boolean };
type Resource = { id: string; title: string; description: string; course_code: string|null; department: string|null; semester: string|null; status: string; uploaded_by: string; storage_path: string|null; mime_type: string|null; file_size_bytes: number|null; created_at: string };

const categories = ["Class Notes","Lecture Slides","PDF Books","Textbooks","Handouts","Previous Year Questions","Question Bank","Model Tests","Assignments","Lab Reports","Research Papers","Thesis","Tutorials","Programming Resources","Video Lectures","Other Resources"];

export default function ExpansionHub({ profile }: { profile: ProfileLite }) {
  const [section, setSection] = useState<"communities"|"library"|"mine">("communities");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityType, setCommunityType] = useState<"public"|"private"|"hidden">("public");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceCategory, setResourceCategory] = useState(categories[0]);
  const [courseCode, setCourseCode] = useState("");
  const [semester, setSemester] = useState("");
  const [resourceFile, setResourceFile] = useState<File|null>(null);
  const [membership, setMembership] = useState<string[]>([]);

  const verified = profile.student_status === "verified";
  const filteredResources = useMemo(() => resources.filter(r => r.status === "approved" && `${r.title} ${r.description} ${r.course_code||""} ${r.department||""}`.toLowerCase().includes(query.toLowerCase())), [resources,query]);

  async function load() {
    if (!supabase) return;
    const [c,m,r] = await Promise.all([
      supabase.from("communities").select("id,name,description,community_type,category,created_by,join_approval").eq("is_deleted",false).eq("community_type","public").order("created_at",{ascending:false}).limit(30),
      supabase.from("community_members").select("community_id").eq("user_id",profile.id).eq("status","active"),
      supabase.from("academic_resources").select("id,title,description,course_code,department,semester,status,uploaded_by,storage_path,mime_type,file_size_bytes,created_at").or(`status.eq.approved,uploaded_by.eq.${profile.id}`).order("created_at",{ascending:false}).limit(100)
    ]);
    if (c.error) setMessage(`Community load: ${c.error.message}`);
    else setCommunities((c.data||[]) as Community[]);
    setMembership((m.data||[]).map((x:any)=>x.community_id));
    if (!r.error) setResources((r.data||[]) as Resource[]);
  }
  useEffect(()=>{ void load(); },[profile.id]);

  async function createCommunity() {
    if (!supabase || !verified || communityName.trim().length<3) return;
    setBusy(true); setMessage("");
    const {error}=await supabase.from("communities").insert({
      name:communityName.trim(),description:communityDescription.trim(),community_type:communityType,
      category:"General",created_by:profile.id,university_id:profile.university_id,join_approval:communityType!=="public"
    });
    setBusy(false);
    if(error) setMessage(error.message);
    else { setCommunityName("");setCommunityDescription("");setMessage("Community created. You are its Owner."); await load(); }
  }
  async function joinCommunity(c:Community) {
    if (!supabase || !verified) return;
    setBusy(true);
    const direct = c.community_type==="public" && !c.join_approval;
    const result = direct
      ? await supabase.from("community_members").insert({community_id:c.id,user_id:profile.id,role:"member",status:"active"})
      : await supabase.from("community_join_requests").insert({community_id:c.id,user_id:profile.id});
    setBusy(false);
    setMessage(result.error ? result.error.message : (direct ? "Joined community." : "Join request sent."));
    await load();
  }
  async function uploadResource() {
    if (!supabase || !verified || !resourceFile || !resourceTitle.trim()) return;
    const f=resourceFile;
    const allowed=["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","image/jpeg","image/png","image/webp"];
    if(f.size>10*1024*1024){setMessage("File exceeds the 10 MB limit.");return;}
    if(!allowed.includes(f.type)){setMessage("Unsupported file type.");return;}
    setBusy(true);setMessage("");
    const safeName=f.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${profile.id}/${crypto.randomUUID()}-${safeName}`;
    const up=await supabase.storage.from("campus-private").upload(path,f,{contentType:f.type,upsert:false});
    if(up.error){setBusy(false);setMessage(up.error.message);return;}
    const cat=await supabase.from("resource_categories").select("id").eq("name",resourceCategory).maybeSingle();
    const ins=await supabase.from("academic_resources").insert({
      title:resourceTitle.trim(),description:resourceDescription.trim(),university_id:profile.university_id,
      department:null,semester:semester||null,course_code:courseCode||null,category_id:cat.data?.id||null,
      storage_path:path,mime_type:f.type,file_size_bytes:f.size,stored_size_bytes:f.size,
      uploaded_by:profile.id,status:"pending",visibility:"university"
    });
    setBusy(false);
    if(ins.error){await supabase.storage.from("campus-private").remove([path]);setMessage(ins.error.message);return;}
    setResourceTitle("");setResourceDescription("");setCourseCode("");setSemester("");setResourceFile(null);
    setMessage("Uploaded for review. It will appear in the library after approval.");
    await load();
  }
  async function removeResource(r:Resource) {
    if(!supabase || r.uploaded_by!==profile.id) return;
    if(!confirm("Delete this resource?")) return;
    const del=await supabase.from("academic_resources").update({deleted_at:new Date().toISOString()}).eq("id",r.id).eq("uploaded_by",profile.id);
    if(del.error){setMessage(del.error.message);return;}
    if(r.storage_path) await supabase.storage.from("campus-private").remove([r.storage_path]);
    setMessage("Resource deleted.");await load();
  }
  async function downloadResource(r:Resource) {
    if(!supabase || !r.storage_path) return;
    const {data,error}=await supabase.storage.from("campus-private").download(r.storage_path);
    if(error){setMessage(error.message);return;}
    const url=URL.createObjectURL(data);const a=document.createElement("a");a.href=url;a.download=r.title;a.click();URL.revokeObjectURL(url);
  }

  if (!verified) return <section className="ccx-gate"><ShieldCheck size={34}/><h2>Verified student access</h2><p>Community creation, membership and Academic Resource Library contributions are available after your student verification is approved.</p></section>;

  return <section className="ccx-hub">
    <div className="ccx-heading"><div><span className="ccx-eyebrow">CAMPUSCONNECT NETWORK</span><h2>Campus spaces & learning library</h2><p>Discover university communities and reviewed study resources.</p></div><span className="ccx-verified"><ShieldCheck size={15}/> Verified</span></div>
    <div className="ccx-tabs">
      <button className={section==="communities"?"active":""} onClick={()=>setSection("communities")}><Users size={16}/> Communities</button>
      <button className={section==="library"?"active":""} onClick={()=>setSection("library")}><BookOpen size={16}/> Academic Library</button>
      <button className={section==="mine"?"active":""} onClick={()=>setSection("mine")}>My Resources</button>
    </div>
    {message&&<div className="ccx-message" role="status">{message}<button onClick={()=>setMessage("")}>×</button></div>}
    {section==="communities"&&<div className="ccx-grid">
      <article className="ccx-panel"><h3><Plus size={18}/> Create a community</h3><p className="ccx-muted">You become the Owner automatically.</p>
        <label>Community name</label><input value={communityName} onChange={e=>setCommunityName(e.target.value)} placeholder="e.g. CSE Study Circle"/>
        <label>Description</label><textarea value={communityDescription} onChange={e=>setCommunityDescription(e.target.value)} placeholder="What is this community about?"/>
        <label>Visibility</label><select value={communityType} onChange={e=>setCommunityType(e.target.value as any)}><option value="public">Public</option><option value="private">Private</option><option value="hidden">Hidden</option></select>
        <button className="ccx-primary" disabled={busy||communityName.trim().length<3} onClick={createCommunity}>{busy?"Creating…":"Create community"}</button>
      </article>
      <article className="ccx-panel"><h3>Discover communities</h3>{communities.length===0?<p className="ccx-muted">No public communities yet.</p>:communities.map(c=><div className="ccx-listrow" key={c.id}><div className="ccx-round"><Users size={18}/></div><div className="ccx-grow"><strong>{c.name}</strong><p>{c.description||"University community"}</p><small><Globe size={12}/> Public</small></div>{membership.includes(c.id)?<span className="ccx-muted">Joined</span>:<button className="ccx-secondary" disabled={busy} onClick={()=>joinCommunity(c)}>Join</button>}</div>)}</article>
    </div>}
    {section==="library"&&<div className="ccx-library">
      <div className="ccx-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, course code, topic…"/></div>
      <article className="ccx-panel"><h3><Upload size={18}/> Upload an academic resource</h3><div className="ccx-formgrid">
        <div><label>Resource title</label><input value={resourceTitle} onChange={e=>setResourceTitle(e.target.value)} placeholder="Resource title"/></div>
        <div><label>Category</label><select value={resourceCategory} onChange={e=>setResourceCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label>Course code</label><input value={courseCode} onChange={e=>setCourseCode(e.target.value)} placeholder="CSE 2201"/></div>
        <div><label>Semester</label><input value={semester} onChange={e=>setSemester(e.target.value)} placeholder="3rd"/></div>
        <div className="ccx-span"><label>Description</label><textarea value={resourceDescription} onChange={e=>setResourceDescription(e.target.value)} placeholder="Describe this resource"/></div>
        <div className="ccx-span"><label>File (PDF, Office documents or images; max 10 MB)</label><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp" onChange={e=>setResourceFile(e.target.files?.[0]||null)}/></div>
      </div><button className="ccx-primary" disabled={busy||!resourceTitle.trim()||!resourceFile} onClick={uploadResource}>{busy?"Uploading…":"Submit for review"}</button></article>
      <div className="ccx-resource-grid">{filteredResources.map(r=><article className="ccx-resource" key={r.id}><span className="ccx-file"><BookOpen size={20}/></span><div className="ccx-grow"><strong>{r.title}</strong><p>{r.course_code||"Academic resource"} · {r.semester||"Semester not specified"}</p><small><Clock3 size={12}/> {new Date(r.created_at).toLocaleDateString()}</small></div><button className="ccx-secondary" onClick={()=>downloadResource(r)}><Download size={15}/> Download</button></article>)}{filteredResources.length===0&&<p className="ccx-muted">No matching approved resources.</p>}</div>
    </div>}
    {section==="mine"&&<div className="ccx-resource-grid">{resources.filter(r=>r.uploaded_by===profile.id).map(r=><article className="ccx-resource" key={r.id}><span className="ccx-file"><BookOpen size={20}/></span><div className="ccx-grow"><strong>{r.title}</strong><p>Status: {r.status}</p></div><button className="ccx-danger" onClick={()=>removeResource(r)}><Trash2 size={15}/> Delete</button></article>)}{resources.every(r=>r.uploaded_by!==profile.id)&&<p className="ccx-muted">Your uploaded resources will appear here after upload. Pending items are not listed in the public library.</p>}</div>}
  </section>;
}

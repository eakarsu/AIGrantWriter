'use strict';
const express = require('express');
const DOMAIN = {"label": "Grant writing", "riskNote": "Flagged grant records need review (deadline/risk keywords).", "noRiskNote": "No flagged grant records in this set.", "actionPrefix": "Next grant action", "features": [["proposal-summary", "overview"], ["deadline-risk", "risk"], ["budget-actions", "action"]]};
let seq = 0;
const store = new Map(); // ownerId -> Map(id->task)
function ownerOf(req){ const u=req.user||{}; return String(u.id||u.userId||u.email||'anonymous'); }
function bucket(owner){ if(!store.has(owner)) store.set(owner,new Map()); return store.get(owner); }
function filterTasks(tasks, q={}){
  const search=String(q.search||q.q||'').toLowerCase(), status=String(q.status||''), priority=String(q.priority||'');
  return tasks.filter(t=>(!search||`${t.title} ${t.description||''}`.toLowerCase().includes(search))&&(!status||t.status===status)&&(!priority||t.priority===priority));
}
function esc(v){ const s=String(v??''); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function toCSV(tasks){ const rows=[['id','title','description','status','priority','createdAt','updatedAt'],...tasks.map(t=>[t.id,t.title,t.description||'',t.status,t.priority,t.createdAt,t.updatedAt])]; return rows.map(r=>r.map(esc).join(',')).join('\n')+'\n'; }
function summarize(records, kind){
  const list=Array.isArray(records)?records:[];
  const byStatus={}, byPriority={};
  for(const r of list){ byStatus[r.status||'unknown']=(byStatus[r.status||'unknown']||0)+1; byPriority[r.priority||'unknown']=(byPriority[r.priority||'unknown']||0)+1; }
  const open=list.filter(r=>!['done','completed','closed'].includes(String(r.status||'').toLowerCase()));
  const flagged=list.filter(r=>/risk|overdue|waste|drift|incident|deadline|contradiction|urgent|expired/i.test(`${r.title||''} ${r.description||''}`));
  if(kind==='risk') return { total:list.length, openCount:open.length, flaggedCount:flagged.length, flaggedTitles:flagged.map(r=>r.title||''), byStatus, note: flagged.length?DOMAIN.riskNote:DOMAIN.noRiskNote };
  if(kind==='action') return { total:list.length, openCount:open.length, nextActions: open.slice(0,5).map(r=>`${DOMAIN.actionPrefix}: ${r.title||'untitled'}`), byPriority };
  return { total:list.length, openCount:open.length, doneCount:list.length-open.length, byStatus, byPriority, sampleTitles:list.slice(0,5).map(r=>r.title||'') };
}
async function providerNarrative(kind, sections){
  const key=process.env.OPENROUTER_API_KEY||process.env.OPENAI_API_KEY;
  if(!key) return null;
  const isOR=!!process.env.OPENROUTER_API_KEY;
  const url=isOR?'https://openrouter.ai/api/v1/chat/completions':'https://api.openai.com/v1/chat/completions';
  const model=process.env.OPENROUTER_MODEL||process.env.OPENAI_MODEL||(isOR?'anthropic/claude-3-5-sonnet-20241022':'gpt-4o-mini');
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),8000);
  try{
    const r=await fetch(url,{method:'POST',signal:ctl.signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:`${DOMAIN.label} ${kind}: summarise in 3 short lines, preserving numbers: ${JSON.stringify(sections)}`}]})});
    if(!r.ok) return null; const j=await r.json(); const text=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
    return text?{narrative:text}:null;
  }catch{ return null; } finally{ clearTimeout(t); }
}
async function aiRespond(res, kind, records){
  const sections=summarize(records, kind);
  const live=await providerNarrative(kind, sections);
  if(live) return res.json({ aiGenerated:true, provider: process.env.OPENROUTER_API_KEY?'openrouter':'openai', label:'Live AI provider response', feature:kind, sections:{...sections,...live} });
  return res.json({ aiGenerated:false, provider:null, label:'Deterministic fallback — no AI provider configured (set OPENROUTER_API_KEY or OPENAI_API_KEY); figures computed directly from your records', feature:kind, sections });
}
function createRouter(){
  const router=express.Router();
  router.use((req,res,next)=>{ if(!req.user) return res.status(401).json({error:'Authentication required'}); next(); });
  router.get('/tasks',(req,res)=>res.json({ tasks: filterTasks([...bucket(ownerOf(req)).values()], req.query) }));
  router.get('/search',(req,res)=>res.json({ tasks: filterTasks([...bucket(ownerOf(req)).values()], req.query), query:req.query.search||req.query.q||'' }));
  router.post('/tasks',(req,res)=>{ const {title,description='',status='todo',priority='medium'}=req.body||{}; if(!title||!String(title).trim()) return res.status(400).json({error:'title is required'}); const now=new Date().toISOString(); const task={id:`task-${++seq}`,title:String(title),description:String(description),status:String(status),priority:String(priority),ownerId:ownerOf(req),createdAt:now,updatedAt:now}; bucket(ownerOf(req)).set(task.id,task); return res.status(201).json({task}); });
  router.put('/tasks/:id',(req,res)=>{ const b=bucket(ownerOf(req)); const t=b.get(req.params.id); if(!t) return res.status(404).json({error:'task not found'}); for(const k of ['title','description','status','priority']) if(req.body&&req.body[k]!==undefined) t[k]=String(req.body[k]); t.updatedAt=new Date().toISOString(); return res.json({task:t}); });
  router.get('/tasks/export',(req,res)=>{ const tasks=filterTasks([...bucket(ownerOf(req)).values()], req.query); if(String(req.query.format||'json').toLowerCase()==='csv'){ res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="tasks.csv"'); return res.send(toCSV(tasks)); } res.setHeader('Content-Disposition','attachment; filename="tasks.json"'); return res.json({tasks}); });
  for(const [path,kind] of DOMAIN.features){ router.post(`/ai/${path}`, async (req,res)=>{ const records=(req.body&&Array.isArray(req.body.records))?req.body.records:[...bucket(ownerOf(req)).values()]; await aiRespond(res, kind, records); }); }
  return router;
}
module.exports={ createRouter, filterTasks, toCSV, summarize, _store:store };

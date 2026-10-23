'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
process.env.OPENROUTER_API_KEY=''; process.env.OPENAI_API_KEY=''; delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const express=require('express'); const {createRouter}=require('../featurePack');
async function withServer(fn){ const app=express(); app.use(express.json()); app.use((req,res,next)=>{ if(req.headers['x-user']) req.user={id:req.headers['x-user']}; next(); }); app.use('/api/feature-pack',createRouter()); const s=app.listen(0); await new Promise(r=>s.on('listening',r)); const base=`http://127.0.0.1:${s.address().port}/api/feature-pack`; try{ await fn(base); } finally{ s.close(); } }
const H={ 'Content-Type':'application/json','x-user':'u1' };
test('auth required, tasks CRUD, search/filter, export, AI fallback', async ()=>{
  await withServer(async(base)=>{
    assert.equal((await fetch(base+'/tasks')).status,401);
    let r=await fetch(base+'/tasks',{method:'POST',headers:H,body:JSON.stringify({title:'Alpha task',status:'todo',priority:'high'})}); assert.equal(r.status,201); const {task}=await r.json();
    await fetch(base+'/tasks',{method:'POST',headers:H,body:JSON.stringify({title:'Beta done',status:'done'})});
    r=await fetch(base+'/tasks',{method:'PUT',headers:{...H},body:JSON.stringify({})}); // no-op guard not used
    let upd=await fetch(base+'/tasks/'+task.id,{method:'PUT',headers:H,body:JSON.stringify({status:'doing'})}); assert.equal((await upd.json()).task.status,'doing');
    let list=await (await fetch(base+'/tasks?search=alpha',{headers:H})).json(); assert.equal(list.tasks.length,1);
    let filt=await (await fetch(base+'/tasks?status=done',{headers:H})).json(); assert.equal(filt.tasks.length,1);
    let csv=await (await fetch(base+'/tasks/export?format=csv',{headers:H})).text(); assert.ok(csv.includes('Alpha task'));
    let js=await (await fetch(base+'/tasks/export?format=json',{headers:H})).json(); assert.equal(js.tasks.length,2);
    let other=await (await fetch(base+'/tasks',{headers:{'x-user':'u2'}})).json(); assert.equal(other.tasks.length,0);
    const aiPath='proposal-summary';
    let ai=await (await fetch(base+'/ai/'+aiPath,{method:'POST',headers:H,body:JSON.stringify({})})).json();
    assert.equal(ai.aiGenerated,false); assert.ok(ai.label.includes('Deterministic fallback')); assert.ok('total' in ai.sections);
    let empty=await (await fetch(base+'/ai/'+aiPath,{method:'POST',headers:H,body:JSON.stringify({records:[]})})).json(); assert.equal(empty.sections.total,0);
  });
});
test('toCSV escapes commas', ()=>{ const {toCSV}=require('../featurePack'); assert.ok(toCSV([{id:'1',title:'a,b',status:'todo',priority:'low',createdAt:'',updatedAt:''}]).includes('"a,b"')); });

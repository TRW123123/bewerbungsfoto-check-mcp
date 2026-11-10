#!/usr/bin/env python3
"""Baut Plugin-ZIP (Agent-Plugins-Format) und Demo-Video. Nutzung: build.py zip|live|video|all  (im Ordner submission/openai/)"""
import json,os,sys,zipfile,subprocess,urllib.request,textwrap,shutil,datetime
H=os.path.dirname(os.path.abspath(__file__)); R=os.path.abspath(os.path.join(H,'..','..'))
C=json.load(open(H+'/config.json')); OUT=H+'/out'; os.makedirs(OUT,exist_ok=True)
ICON=os.path.join(H,'..','icon-512.png')

def manifest():
    ver=json.load(open(R+'/package.json'))['version']
    cases=dict(positive=[dict(description=p['description'],prompt=p['prompt'],tools_triggered=p['tool'],expected_behavior=p['expected']) for p in C['pos']],
               negative=[dict(description=f"Out of scope ({n['id']})",prompt=n['prompt']) for n in C['neg']])
    return {"$schema":"https://agent-plugins.org/schemas/1.0.0/plugin.schema.json","name":C['slug'],"version":ver,
     "description":C['short']+'. '+C['long'].split('. ')[0]+'.' if False else C['long'][:400].rsplit('. ',1)[0]+'.',
     "author":{"name":C['developer'],"email":C['email'],"url":C['url']},"homepage":C['website'],"repository":C['repo'],"license":"MIT","keywords":C['keywords'],
     "extensions":{"com.openai":{"interface":{"displayName":C['display'],"shortDescription":C['short'],"longDescription":C['long'],"developerName":C['developer'],
        "category":"Productivity","capabilities":[],"websiteURL":C['website'],"supportURL":C['support'],"privacyPolicyURL":C['privacy'],"termsOfServiceURL":C['terms'],
        "defaultPrompt":C['prompts'],"composerIcon":"./assets/icon.png","logo":"./assets/logo.png"},
      "review":{"test_cases":cases,"commerce":False,"commerce_description":"This plugin is free, requires no sign-in and does not sell products or process payments."},
      "publication":{"release_notes":C['release_notes']}}}}

def mcpjson(): return {"$schema":"https://agent-plugins.org/schemas/1.0.0/mcp.schema.json","mcpServers":{C['slug']:{"type":"streamable-http","url":C['mcp']}}}

def build_zip():
    m=manifest(); lim=m['extensions']['com.openai']['interface']
    assert len(lim['displayName'])<=30 and len(lim['shortDescription'])<=30 and len(lim['longDescription'])<=4000
    assert all(len(p)<=128 for p in lim['defaultPrompt']) and len(C['pos'])==5 and len(C['neg'])==3
    json.dump(m,open(H+'/plugin.json','w'),indent=2,ensure_ascii=False); json.dump(mcpjson(),open(H+'/mcp.json','w'),indent=2)
    z=f"{OUT}/{C['slug']}-plugin.zip"
    with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as zf:
        zf.write(H+'/plugin.json','plugin.json'); zf.write(H+'/mcp.json','mcp.json')
        zf.write(ICON,'assets/icon.png'); zf.write(ICON,'assets/logo.png')
    print('ZIP',z,os.path.getsize(z),zipfile.ZipFile(z).namelist())

def rpc(method,params=None,i=1):
    req=urllib.request.Request(C['mcp'],json.dumps({"jsonrpc":"2.0","id":i,"method":method,"params":params or {}}).encode(),
      {"Content-Type":"application/json","Accept":"application/json, text/event-stream","User-Agent":"openai-submission-demo/1.0"})
    t=urllib.request.urlopen(req,timeout=60).read().decode()
    if t.startswith('event:') or 'data:' in t[:20]: t=[l[5:] for l in t.splitlines() if l.startswith('data:')][0]
    return json.loads(t)

def live():
    log=dict(date=datetime.datetime.now().astimezone().isoformat(timespec='seconds'),endpoint=C['mcp'],calls=[])
    log['initialize']=rpc('initialize',{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"submission-demo","version":"1"}})
    log['tools']=[{k:t[k] for k in('name','annotations') if k in t} for t in rpc('tools/list',i=2)['result']['tools']]
    for n,p in enumerate(C['pos'],10):
        r=rpc('tools/call',{"name":p['tool'],"arguments":p['arguments']},n)
        log['calls'].append(dict(id=p['id'],prompt=p['prompt'],tool=p['tool'],arguments=p['arguments'],response=r))
    json.dump(log,open(OUT+'/live-transcript.json','w'),indent=1,ensure_ascii=False); print('live ok',len(log['calls']))

def summarize(resp):
    r=resp.get('result',{}); sc=r.get('structuredContent')
    if sc is None:
        try: sc=json.loads(r['content'][0]['text'])
        except Exception: sc={'text':r.get('content',[{}])[0].get('text','')[:600]}
    lines=[]
    for k,v in sc.items():
        if k in('checks','criteria'):
            for c in v[:6]:
                msg=str(c.get('message') or c.get('detail') or c.get('summary') or '')
                lines.append(f"  {c.get('id') or c.get('name')}: {c.get('status')} {msg}")
        elif isinstance(v,(str,int,float,bool)): lines.append(f"{k}: {v}")
        elif isinstance(v,list) and v and isinstance(v[0],str): lines.append(f"{k}: "+', '.join(v[:8]))
        else: lines.append(f"{k}: …")
    return lines

def video():
    from PIL import Image,ImageDraw,ImageFont
    log=json.load(open(OUT+'/live-transcript.json'))
    fm='/usr/share/fonts/truetype/sand-box/google/Geist Mono/GeistMono-Italic-VariableFont_wght.ttf'
    F=lambda s:ImageFont.truetype(fm,s)
    W,Hh=1920,1080; fr=OUT+'/frames'; shutil.rmtree(fr,ignore_errors=True); os.makedirs(fr)
    def card(name,title,body,sec,color=(24,28,36)):
        im=Image.new('RGB',(W,Hh),color); d=ImageDraw.Draw(im)
        d.rectangle([0,0,W,70],fill=(40,46,60)); d.text((40,18),f"{C['display']} · live MCP tool calls (Streamable HTTP, JSON-RPC)",font=F(28),fill=(190,200,220))
        d.text((60,110),title,font=F(42),fill=(255,214,102)); y=190
        for ln in body:
            for w in (textwrap.wrap(ln,110) or ['']):
                if y<Hh-60: d.text((60,y),w,font=F(28),fill=(225,230,240)); y+=40
        d.text((60,Hh-50),f"Endpoint: {C['mcp']} · Called {log['date'][:10]} · no authentication",font=F(22),fill=(130,140,160))
        im.save(f"{fr}/{name}.png"); return (name,sec)
    seq=[]
    seq.append(card('00','Overview',[C['display'],'',C['long'][:520]+'…','','All following responses come from real calls against the live endpoint.','Calls are plain JSON-RPC (tools/call), not recorded inside a ChatGPT client.'],7))
    seq.append(card('01','Connection: initialize + tools/list',[f"Server: {log['initialize']['result']['serverInfo']['title']} v{log['initialize']['result']['serverInfo']['version']}",f"URL: {C['mcp']}",'Authentication: none','Tools and annotations:']+[f"  {t['name']}: "+', '.join(f"{k}={v}" for k,v in t['annotations'].items() if k.endswith('Hint')) for t in log['tools']],10))
    for c in log['calls']:
        a=json.dumps(c['arguments'],ensure_ascii=False); a=a if len(a)<420 else a[:420]+'…'
        seq.append(card('call_'+c['id'],f"Positive case {c['id']}: {c['tool']}",['Prompt: '+c['prompt'][:300],'','tools/call arguments:',a,'','Response (excerpt, live):']+summarize(c['response'])[:9],12))
    seq.append(card('neg','Negative cases (routing expectation)',['These 3 cases are expectations for the assistant: no tool call.','They are NOT demonstrated live here; routing is checked by the review team in the assistant.','']+[f"{n['id']}: {n['prompt'][:140]}" for n in C['neg']],12))
    seq.append(card('end','End',[f"Website: {C['website']}",f"Support: {C['support']}",f"Privacy: {C['privacy']}",f"Terms: {C['terms']}",f"Docs: {C['docs']}"],6))
    lst=OUT+'/concat.txt'; t=0; srt=[]
    with open(lst,'w') as f:
        for i,(n,s) in enumerate(seq):
            f.write(f"file 'frames/{n}.png'\nduration {s}\n"); 
        f.write(f"file 'frames/{seq[-1][0]}.png'\n")
    out=f"{OUT}/{C['slug']}-demo.mp4"
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',lst,'-vf','fps=10,format=yuv420p','-c:v','libx264','-crf','28','-movflags','+faststart',out],check=True)
    print('VIDEO',out,os.path.getsize(out),sum(s for _,s in seq),'s')

if __name__=='__main__':
    a=sys.argv[1] if len(sys.argv)>1 else 'all'
    if a in('zip','all'): build_zip()
    if a in('live','all'): live()
    if a in('video','all'): video()

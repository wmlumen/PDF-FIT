import pdfplumber,re,json,sys
p=pdfplumber.open(sys.argv[1])
res={}
for i in range(1,19):
    pg=p.pages[i]
    ws=pg.extract_words(keep_blank_chars=False,use_text_flow=False,x_tolerance=1.5)
    head=pg.extract_text().split('\n')[1]
    dep=re.sub(r'^DEPARTAMENTO DE\s*','',head).strip()
    # agrupar palabras por línea
    ws.sort(key=lambda w:(round(w['top']),w['x0']))
    lines=[]
    for w in ws:
        if lines and abs(lines[-1][0]['top']-w['top'])<2.5: lines[-1].append(w)
        else: lines.append([w])
    # segmentos: secuencias contiguas en x (gap<6) dentro de la línea
    segs=[]
    for ln in lines:
        ln.sort(key=lambda w:w['x0']);cur=[ln[0]]
        for w in ln[1:]:
            if w['x0']-cur[-1]['x1']<7 and (bool(re.fullmatch(r'\d+',w['text']))==bool(re.fullmatch(r'\d+',cur[-1]['text']))): cur.append(w)
            else: segs.append(cur);cur=[w]
        segs.append(cur)
    nums=[];labs=[]
    for s in segs:
        t=' '.join(w['text'] for w in s);x0=min(w['x0'] for w in s);x1=max(w['x1'] for w in s);top=min(w['top'] for w in s);bot=max(w['bottom'] for w in s)
        o=dict(t=t,x0=x0,x1=x1,top=top,bot=bot)
        if re.fullmatch(r'\d{1,3}( \d{3})+|\d{6,}',t): nums.append(o)
        elif re.search(r'[A-ZÁÉÍÓÚÑ]',t) and not re.search(r'%|RECAUDACI|POTENCIAL|DEPARTAMENTO|LAICNETOP|NÓICADUACER|ROYAM|NOC$|SOTIRTSID|DISTRITO EN GS',t): labs.append(o)
    # etiquetas "DISTRITO DE ..." son anotaciones; se excluyen
    labs=[l for l in labs if not l['t'].startswith('DISTRITO')]
    out={}
    for n in nums:
        cx=(n['x0']+n['x1'])/2
        cand=[l for l in labs if 0<=n['top']-l['bot']<14 and l['x0']-25<cx<l['x1']+25]
        if not cand: continue
        l=min(cand,key=lambda l:(n['top']-l['bot'])+abs((l['x0']+l['x1'])/2-cx)/10)
        # etiquetas de dos líneas: unir con la línea de arriba si está pegada
        up=[u for u in labs if 0<=l['top']-u['bot']<4 and abs((u['x0']+u['x1'])/2-(l['x0']+l['x1'])/2)<40]
        name=(up[0]['t']+' '+l['t']) if up else l['t']
        out[name]=int(n['t'].replace(' ',''))
    res[dep]=out
json.dump(res,open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
for d,o in res.items(): print(d,len(o),sum(o.values()))

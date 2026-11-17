# Copia dello studio del 17/11/2026 (dati EODHD da strumenti/prova_eodhd3.py + FRED). Risultati riportati in cot_radar/btc_macro.py.
# Studio 3: Bitcoin dal 2011 (EODHD) contro macro (FRED) e mercati (EODHD); correlazioni con oro e S&P 500 per ciclo.
import json, pandas as pd, numpy as np, warnings; warnings.filterwarnings("ignore")
E_=json.load(open("btc_fattori.json"))
def eod(k): c=E_[k]["c"];return pd.Series([v for _,v in c],index=pd.to_datetime([d for d,_ in c])).astype(float)
L=lambda s:pd.read_csv(f"{s}.csv",parse_dates=[0],index_col=0,na_values=".").iloc[:,0].astype(float).dropna()
btc=eod("BTC");btc=btc[btc.index>="2011-01-01"]
spx,oro,dxy,hyg,tlt,ndx=eod("SP500"),eod("ORO"),eod("DOLLARO"),eod("HIGHYIELD"),eod("TREASURY20"),eod("NDX")
nfci,real,dff=L("NFCI"),L("DFII10"),L("DFF")
ME=lambda s:s.resample("ME").last()
m=pd.DataFrame({"btc":ME(btc)}).dropna()
r=np.log(m.btc).diff();fwd=r.shift(-1)
PER={"2011-16":("2011","2016"),"2017-21":("2017","2021"),"2022-26":("2022","2026")}
F={"Condizioni finanziarie (NFCI)":(ME(nfci),"diff"),"Dollaro (DXY)":(ME(dxy),"pct"),"Tasso reale 10a":(ME(real),"diff"),
   "Credito high yield (HYG)":(ME(hyg),"pct"),"S&P 500":(ME(spx),"pct"),"Nasdaq-100":(ME(ndx),"pct"),"Oro":(ME(oro),"pct"),
   "Treasury 20+ (TLT)":(ME(tlt),"pct"),"Tasso Fed":(ME(dff),"diff")}
rng=np.random.default_rng(5);rows=[]
for k,(s,t) in F.items():
    s=s.reindex(m.index,method="ffill")
    c3=s.pct_change(3) if t=="pct" else s.diff(3); c1=s.pct_change() if t=="pct" else s.diff()
    x=pd.DataFrame({"r":r,"c1":c1,"c3":c3,"f":fwd}).dropna()
    g=x.c3>0; dif=x.f[g].mean()-x.f[~g].mean()
    sim=np.array([x.f[h].mean()-x.f[~h].mean() for h in (rng.permutation(g.values) for _ in range(4000))]);p=np.mean(np.abs(sim)>=abs(dif))
    per=[(lambda y:(y.f[y.c3>0].mean()-y.f[y.c3<=0].mean())*100)(x.loc[a:b]) for a,b in PER.values()]
    rows.append([k,round(x.r.corr(x.c1),2),round(x.f[g].mean()*100,1),round(np.mean(x.f[g]>0)*100),round(x.f[~g].mean()*100,1),round(np.mean(x.f[~g]>0)*100),round(dif*100,1),round(p,3)]+[round(v,1) for v in per]+[len(x)])
T=pd.DataFrame(rows,columns=["fattore","corr","f_sale","pos_sale","f_scende","pos_scende","diff","p","d11_16","d17_21","d22_26","n"])
print("== FATTORE IN SALITA a 3 mesi vs IN DISCESA: Bitcoin il mese dopo (%), dal 2011");print(T.sort_values("p").to_string(index=False))

print("\n== CORRELAZIONE SETTIMANALE di Bitcoin con S&P 500 e ORO (rendimenti settimanali)")
W=lambda s:np.log(s.resample("W-FRI").last()).diff()
w=pd.DataFrame({"btc":W(btc),"spx":W(spx),"oro":W(oro)}).dropna()
print(" per anno:");print(w.groupby(w.index.year).corr().xs("btc",level=1)[["spx","oro"]].round(2).T.to_string())
# cicli: (a) Fed che alza / taglia (tasso Fed a 6 mesi); (b) S&P 500 sopra/sotto la media a 200 giorni;
#        (c) fase del ciclo del dimezzamento (halving) di Bitcoin; (d) stress: VIX alto
spx200=(spx>spx.rolling(200).mean()).resample("W-FRI").last()
fed=dff.resample("W-FRI").last().diff(26)
H=pd.to_datetime(["2012-11-28","2016-07-09","2020-05-11","2024-04-19"])
fase=pd.Series([ (lambda d:(d-H[H<=d].max()).days//365 if (H<=d).any() else -1)(d) for d in w.index],index=w.index)
w["toro"]=spx200.reindex(w.index,method="ffill");w["fed"]=fed.reindex(w.index,method="ffill");w["fase"]=fase
vix=L("VIXCLS").resample("W-FRI").last();w["vix"]=vix.reindex(w.index,method="ffill")
def cc(y):return f"S&P {y.btc.corr(y.spx):+.2f} | oro {y.btc.corr(y.oro):+.2f} | n={len(y)}"
print(" S&P 500 sopra la media 200g (mercato toro):",cc(w[w.toro==1]));print(" S&P 500 sotto la media 200g (mercato orso):",cc(w[w.toro==0]))
print(" Fed che ALZA i tassi (6 mesi):",cc(w[w.fed>0.25]));print(" Fed che TAGLIA i tassi:",cc(w[w.fed<-0.25]));print(" Fed ferma:",cc(w[w.fed.abs()<=0.25]))
print(" VIX sopra 25 (paura):",cc(w[w.vix>25]));print(" VIX sotto 25:",cc(w[w.vix<=25]))
for k in range(4):print(f" anno {k+1} dopo l'halving:",cc(w[w.fase==k]))
print(" settimane peggiori dell'S&P (sotto -3%):",cc(w[w.spx<-0.03]),"| BTC medio in quelle settimane %+.1f%%"%(w.btc[w.spx<-0.03].mean()*100))
print("\n== PUNTEGGIO MACRO 0-3: NFCI in allentamento + dollaro in discesa + high yield in salita (3 mesi)")
idx=m.index
a=(ME(nfci).reindex(idx,method="ffill").diff(3)<=0).astype(int);b=(ME(dxy).reindex(idx,method="ffill").pct_change(3)<=0).astype(int);c=(ME(hyg).reindex(idx,method="ffill").pct_change(3)>0).astype(int)
x=pd.DataFrame({"s":a+b+c,"f":fwd}).dropna();x=x[x.index>="2011-04-01"]
for per,(p0,p1) in {"tutto":("2011","2026"),**PER}.items():
    y=x.loc[p0:p1];print(f" {per:8s}"," | ".join(f"{k}: {y.f[y.s==k].mean()*100:+5.1f}% pos {np.mean(y.f[y.s==k]>0)*100:3.0f}% n={sum(y.s==k):2d}" for k in range(4)))
# drawdown medio del mese dopo e rendimento cumulato tenendo BTC solo con punteggio >=2 (didattico, senza costi)
s=x.s.shift(0);esp=(x.s>=2).astype(int)
cum=lambda q:float(np.exp(q.sum())) 
print(" sempre investito: x%.0f | solo con punteggio>=2: x%.0f | mesi investiti %d su %d"%(cum(x.f),cum(x.f[esp==1]),esp.sum(),len(x)))
print(" ultimo mese",x.index[-1].date(),"punteggio",int(x.s.iloc[-1]),"(NFCI",int(a.iloc[-2] if len(a)>1 else 0),")")
print(" oggi: NFCI giu'?",bool(a.iloc[-1]),"dollaro giu'?",bool(b.iloc[-1]),"HY su?",bool(c.iloc[-1]))

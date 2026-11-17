# Studio del 17/11/2026: COT CFTC (CME Bitcoin) + Fear & Greed Index (alternative.me). Esito: nessun segnale stabile.
# Studio 4: il sentiment retail anticipa Bitcoin? (COT CFTC piccoli trader + Fear & Greed Index), dal 2018
import json, pandas as pd, numpy as np, warnings; warnings.filterwarnings("ignore")
E_=json.load(open("btc_fattori.json"))
btc=pd.Series([v for _,v in E_["BTC"]["c"]],index=pd.to_datetime([d for d,_ in E_["BTC"]["c"]])).astype(float)
fw=lambda d,n:np.log(btc.reindex([d+pd.Timedelta(days=n)],method="ffill").iloc[0]/btc.reindex([d],method="ffill").iloc[0]) if d+pd.Timedelta(days=n)<=btc.index[-1] else np.nan
rng=np.random.default_rng(9)
def test(nome,serie_gruppi,giorni=28):
    # serie_gruppi: Series data -> gruppo; rendimento BTC nei `giorni` successivi; campioni settimanali (no doppioni)
    x=pd.DataFrame({"g":serie_gruppi});x["f"]=[fw(d,giorni) for d in x.index];x=x.dropna()
    print(f"\n== {nome} (BTC nei {giorni} giorni dopo)")
    tot=x.f.mean()
    for g,y in x.groupby("g"):
        p1=y.loc[:"2021"];p2=y.loc["2022":]
        print(f"  {g:22s} media {y.f.mean()*100:+6.1f}%  pos {np.mean(y.f>0)*100:3.0f}%  n={len(y):3d} | 2018-21 {p1.f.mean()*100:+6.1f}% ({len(p1)}) | 2022-26 {p2.f.mean()*100:+6.1f}% ({len(p2)})")
    return x
# 1) COT: piccoli trader (non reportable) e grandi speculatori (non commercial), netto in % dell'open interest,
#    indice 0-100 sulle ultime 52 settimane (come il COT Index del terminale)
c=pd.DataFrame(json.load(open("cot_btc.json")));c.index=pd.to_datetime(c.report_date_as_yyyy_mm_dd.str[:10])
for k in ["noncomm_positions_long_all","noncomm_positions_short_all","nonrept_positions_long_all","nonrept_positions_short_all","open_interest_all"]:c[k]=c[k].astype(float)
c["retail"]=(c.nonrept_positions_long_all-c.nonrept_positions_short_all)/c.open_interest_all*100
c["spec"]=(c.noncomm_positions_long_all-c.noncomm_positions_short_all)/c.open_interest_all*100
idx=lambda s:((s-s.rolling(52,min_periods=26).min())/(s.rolling(52,min_periods=26).max()-s.rolling(52,min_periods=26).min())*100)
c["ri"]=idx(c.retail);c["si"]=idx(c.spec)
c.index=c.index+pd.Timedelta(days=3)          # il report del martedi' esce il venerdi': si usa da venerdi'
grp=lambda v:None if pd.isna(v) else ("1 molto pessimisti" if v<=20 else "3 molto ottimisti" if v>=80 else "2 nel mezzo")
test("COT piccoli trader (retail), indice 52 settimane",c.ri.map(grp))
test("COT grandi speculatori, indice 52 settimane",c.si.map(grp))
print("  correlazione retail netto vs speculatori netti:",round(c.retail.corr(c.spec),2))
# 2) Fear & Greed Index (alternative.me), campionato il venerdi'
f=pd.DataFrame(json.load(open("fng.json"))["data"]);f.index=pd.to_datetime(f.timestamp.astype(int),unit="s");f=f.sort_index();v=f.value.astype(float)
vw=v.resample("W-FRI").last()
fg=lambda x:"1 paura estrema (<25)" if x<25 else "2 paura (25-45)" if x<45 else "3 neutro (45-55)" if x<=55 else "4 avidita' (55-75)" if x<=75 else "5 avidita' estrema (>75)"
X=test("Fear & Greed Index",vw.map(fg))
test("Fear & Greed Index, 13 settimane dopo",vw.map(fg),91)
# permutazione: paura estrema vs avidita' estrema
a=X.f[X.g.str.startswith("1")];b=X.f[X.g.str.startswith("5")];oss=a.mean()-b.mean();z=pd.concat([a,b]).values
sim=[(lambda q:q[:len(a)].mean()-q[len(a):].mean())(rng.permutation(z)) for _ in range(5000)]
print(f"  paura estrema - avidita' estrema: {oss*100:+.1f} punti, p={np.mean(np.abs(sim)>=abs(oss)):.3f}")
print("\noggi: Fear & Greed",int(v.iloc[-1]),f.value_classification.iloc[-1],"| COT retail indice",round(c.ri.iloc[-1]),"speculatori",round(c.si.iloc[-1]),"(",c.index[-1].date(),")")

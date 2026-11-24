/* ---------- v9.21 SPIEGAZIONI BREVI SULLE CARD (idea di Ya) ----------
   Qualsiasi elemento con data-spiega="testo": sul PC appare al passaggio del mouse, sul telefono al tocco
   (un secondo tocco, o un tocco altrove, la chiude). Una sola nuvoletta per pagina, sempre dentro lo schermo.
   Uso: <div class="card" data-spiega="Cosa significa questo numero.">. Testi brevi: il dettaglio resta nella (i). */
(function(){try{
 let bolla=null,cor=null;
 const crea=()=>{if(bolla)return bolla;bolla=document.createElement("div");bolla.className="spiega";bolla.setAttribute("role","tooltip");document.body.appendChild(bolla);return bolla;};
 function mostra(el){const b=crea();b.textContent=(typeof T=="function"?T(el.dataset.spiega):el.dataset.spiega);cor=el;b.classList.add("on");
  const r=el.getBoundingClientRect(),w=Math.min(300,innerWidth-24);b.style.maxWidth=w+"px";
  const bw=b.offsetWidth,bh=b.offsetHeight;let x=r.left+Math.min(24,r.width/2),y=r.top-bh-8;
  if(y<8)y=r.bottom+8;x=Math.max(12,Math.min(x,innerWidth-bw-12));b.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;}
 function nascondi(){if(bolla)bolla.classList.remove("on");cor=null;}
 document.addEventListener("pointerover",e=>{if(e.pointerType!="mouse")return;const el=e.target.closest&&e.target.closest("[data-spiega]");if(el&&el!=cor)mostra(el);});
 document.addEventListener("pointerout",e=>{if(e.pointerType!="mouse"||!cor)return;if(!e.relatedTarget||!cor.contains(e.relatedTarget))nascondi();});
 document.addEventListener("click",e=>{if(matchMedia("(hover:hover)").matches)return;const el=e.target.closest&&e.target.closest("[data-spiega]");
  if(el&&!e.target.closest("button,a,select,input,summary")){el==cor?nascondi():mostra(el);}else nascondi();},true);
 addEventListener("scroll",nascondi,{passive:true});addEventListener("resize",nascondi);
}catch(e){console.warn("[EdgeValor] spiega",e);}})();

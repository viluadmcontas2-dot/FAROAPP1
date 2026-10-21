<script type="text/x-dc" data-dc-script="" data-props="{&quot;$preview&quot;:{&quot;width&quot;:412,&quot;height&quot;:866},&quot;theme&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;options&quot;:[&quot;noturno&quot;,&quot;dia&quot;],&quot;default&quot;:&quot;noturno&quot;,&quot;tsType&quot;:&quot;string&quot;},&quot;startScreen&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;options&quot;:[&quot;home&quot;,&quot;onb0&quot;,&quot;onb1&quot;,&quot;onb2&quot;,&quot;onb3&quot;,&quot;onb4&quot;,&quot;onb5&quot;,&quot;onb6&quot;,&quot;close0&quot;,&quot;close1&quot;,&quot;close2&quot;,&quot;plan&quot;,&quot;bills&quot;,&quot;car&quot;,&quot;remind&quot;,&quot;journey&quot;],&quot;default&quot;:&quot;home&quot;,&quot;tsType&quot;:&quot;string&quot;},&quot;startPeriod&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;options&quot;:[&quot;dia&quot;,&quot;semana&quot;,&quot;mes&quot;],&quot;default&quot;:&quot;dia&quot;,&quot;tsType&quot;:&quot;string&quot;},&quot;sheet&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;options&quot;:[&quot;&quot;,&quot;in&quot;,&quot;out&quot;,&quot;bill&quot;],&quot;default&quot;:&quot;&quot;,&quot;tsType&quot;:&quot;string&quot;}}">
const TH={
 noturno:{bg:'#07090F',surface:'#11151F',surface2:'#1A1F2C',ink:'#F3F1EC',muted:'#8F95A6',line:'rgba(255,255,255,.06)',line2:'rgba(255,255,255,.13)',accent:'#6EA0FF',accentSoft:'rgba(110,160,255,.14)',gold:'#E9B04B',goldInk:'#1A1100',goldSoft:'rgba(233,176,75,.13)',pos:'#3DDC97',posInk:'#04120B',neg:'#FF6B6B',negSoft:'rgba(255,107,107,.1)',negLine:'rgba(255,107,107,.3)',cW:'#8FB4FF',cF:'#4FA8E8',cL:'#38C6D9',nav:'rgba(17,21,31,.92)',logoBg:'#0E1222',
  heroBg:'conic-gradient(from 212deg at 104% -2%, rgba(233,176,75,0) 0deg, rgba(233,176,75,.22) 9deg, rgba(233,176,75,0) 24deg), radial-gradient(120% 70% at 100% 0%, rgba(110,160,255,.22), rgba(110,160,255,0) 65%), linear-gradient(180deg, #161B2E 0%, #0B0E18 100%)'},
 dia:{bg:'#EEF1F6',surface:'#FFFFFF',surface2:'#F0F3F8',ink:'#0D1530',muted:'#677290',line:'rgba(13,21,48,.06)',line2:'rgba(13,21,48,.13)',accent:'#2B5BEF',accentSoft:'rgba(43,91,239,.1)',gold:'#F0A81E',goldInk:'#221500',goldSoft:'rgba(240,168,30,.15)',pos:'#0E9F6E',posInk:'#fff',neg:'#E5484D',negSoft:'rgba(229,72,77,.07)',negLine:'rgba(229,72,77,.25)',cW:'#6E9BF2',cF:'#1B8FD6',cL:'#0FA3B8',nav:'rgba(255,255,255,.94)',logoBg:'#16349F',
  heroBg:'conic-gradient(from 212deg at 104% -2%, rgba(255,199,77,0) 0deg, rgba(255,214,120,.3) 9deg, rgba(255,199,77,0) 24deg), radial-gradient(120% 70% at 100% 0%, rgba(120,175,255,.45), rgba(120,175,255,0) 65%), linear-gradient(170deg, #2A56EA 0%, #10288A 100%)'}
};
const LOGO={uber:'assets/platforms/faro-platform-uber.svg',n99:'assets/platforms/faro-platform-99.svg',indrive:'assets/platforms/faro-platform-indrive.svg'};
const PLAT=[['uber','Uber'],['n99','99'],['indrive','inDrive'],['extra','Particular/gorjeta']];
const FUEL={gasolina:{label:'Gasolina',unit:'L',price:6.29,eff:11,icon:'ph-duotone ph-drop'},etanol:{label:'Etanol',unit:'L',price:4.39,eff:7.8,icon:'ph-duotone ph-plant'},gnv:{label:'GNV',unit:'m³',price:4.79,eff:13.2,icon:'ph-duotone ph-cylinder'},hibrido:{label:'Híbrido',unit:'L',price:6.29,eff:17,icon:'ph-duotone ph-leaf'},eletrico:{label:'Elétrico',unit:'kWh',price:0.95,eff:6.5,icon:'ph-duotone ph-lightning'}};
const ENERGIES=[['flex','Flex','ph-duotone ph-gas-pump'],['gasolina','Gasolina','ph-duotone ph-drop'],['etanol','Etanol','ph-duotone ph-plant'],['gnv','GNV','ph-duotone ph-cylinder'],['hibrido','Híbrido','ph-duotone ph-leaf'],['eletrico','Elétrico','ph-duotone ph-lightning']];
const EXP=[['Combustível','ph-duotone ph-gas-pump'],['Alimentação','ph-duotone ph-fork-knife'],['Lavagem','ph-duotone ph-drop-half'],['Manutenção','ph-duotone ph-wrench'],['Pedágio','ph-duotone ph-road-horizon'],['Outros','ph-duotone ph-dots-three-circle']];
const CATS=[['carro','Carro'],['casa','Casa'],['cartao','Cartão'],['pessoal','Pessoal']];
const ICONS=['ph-lightbulb','ph-drop','ph-wifi-high','ph-credit-card','ph-barcode','ph-house-line','ph-graduation-cap','ph-heartbeat'];
const COLORS=['#F2B544','#4FC3F7','#5B95FF','#B36BFF','#FF8F6B','#3DDC97','#FF6B9A'];
const PRESETS=[['Luz','ph-lightbulb','#F2B544','casa'],['Água','ph-drop','#4FC3F7','casa'],['Internet','ph-wifi-high','#5B95FF','casa'],['Cartão','ph-credit-card','#B36BFF','cartao'],['Boleto','ph-barcode','#FF8F6B','pessoal'],['Escola','ph-graduation-cap','#3DDC97','pessoal'],['Plano de saúde','ph-heartbeat','#FF6B9A','pessoal'],['Seguro do carro','ph-shield-check','#5B95FF','carro']];
const BILLS0=[
 {id:'aluguel-carro',name:'Aluguel do carro',icon:'ph-car-profile',color:'#5B95FF',cat:'carro',v:650,rec:'semanal',due:1,on:true,veh:'alugado'},
 {id:'parcela-carro',name:'Parcela do carro',icon:'ph-bank',color:'#5B95FF',cat:'carro',v:1450,rec:'mensal',due:15,on:true,veh:'financiado'},
 {id:'seguro',name:'Seguro do carro',icon:'ph-shield-check',color:'#5B95FF',cat:'carro',v:189,rec:'mensal',due:12,on:true,veh:'dono'},
 {id:'aluguel-casa',name:'Aluguel de casa',icon:'ph-house-line',color:'#A08CFF',cat:'casa',v:1200,rec:'mensal',due:5,on:true},
 {id:'internet',name:'Internet',icon:'ph-wifi-high',color:'#5B95FF',cat:'casa',v:99.9,rec:'mensal',due:10,on:true},
 {id:'celular',name:'Celular',icon:'ph-device-mobile',color:'#1AA3D9',cat:'pessoal',v:79.9,rec:'mensal',due:10,on:true},
 {id:'geladeira',name:'Boleto geladeira 4/10',icon:'ph-barcode',color:'#FF8F6B',cat:'pessoal',v:189,rec:'mensal',due:15,on:true},
 {id:'agua',name:'Água',icon:'ph-drop',color:'#4FC3F7',cat:'casa',v:92.1,rec:'mensal',due:18,on:true},
 {id:'mei',name:'MEI / INSS',icon:'ph-identification-badge',color:'#3DDC97',cat:'pessoal',v:81.05,rec:'mensal',due:20,on:true},
 {id:'luz',name:'Luz',icon:'ph-lightbulb',color:'#F2B544',cat:'casa',v:186.4,rec:'mensal',due:25,on:true},
 {id:'cartao',name:'Cartão de crédito',icon:'ph-credit-card',color:'#B36BFF',cat:'cartao',v:540,rec:'mensal',due:28,on:true}];
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const TODAY=21, MDAYS=31;
const wd=d=>((3+(d-21))%7+7)%7;
const mi=d=>(wd(d)+6)%7;
const fmt=(n,d=2)=>(n<0?'−':'')+Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const R=(n,d=0)=>'R$ '+fmt(n,d);
const split=n=>{const s=fmt(n);const i=s.lastIndexOf(',');return [s.slice(0,i),s.slice(i)]};
const G=[452,418,506,388,472,431,515,398,462,540,410,447,489,376,502,436,468],RK=[2.12,2.25,2.08,2.3,2.18,2.05,2.22,2.15,2.1,2.28,2.02,2.2,2.16,2.06,2.24,2.11,2.19],HR=[9.5,8.5,10,8,9.5,9,10.5,8,9,11,8.5,9,10,7.5,10,9,9.5];
const genRecords=()=>{const o={};let i=0;for(let d=1;d<TODAY;d++){if(mi(d)>=6)continue;if(d===13){i++;continue}const g=G[i%G.length],a=.5+(i%4)*.03,b=.27-(i%3)*.02,c=.14,e=1-a-b-c;o[d]={p:{uber:+(g*a).toFixed(2),n99:+(g*b).toFixed(2),indrive:+(g*c).toFixed(2),extra:+(g*e).toFixed(2)},km:Math.round(g/RK[i%RK.length]),h:HR[i%HR.length],exp:i%3===0?18:0,closed:true};i++}o[TODAY]={p:{uber:186.4,n99:72,indrive:0,extra:0},km:0,h:0,exp:24,closed:false};return o};
const pnum=s=>parseInt(s||'0',10)/100;
const RIDE=new Set(['uber','n99','indrive','extra']);const isRide=k=>RIDE.has(k);
const rideSum=p=>Object.keys(p||{}).filter(isRide).reduce((a,k)=>a+(p[k]||0),0);
const CountUp=({value})=>{const [v,setV]=React.useState(value);const ref=React.useRef(value);React.useEffect(()=>{const from=ref.current,to=value;if(from===to)return;const t0=performance.now();let raf;const step=now=>{const p=Math.min(1,(now-t0)/650),e=1-Math.pow(1-p,3);const cur=from+(to-from)*e;setV(cur);ref.current=cur;if(p<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[value]);const [i,c]=split(v);return React.createElement(React.Fragment,null,React.createElement('span',{style:{fontFamily:"'Bricolage Grotesque'",fontSize:58,fontWeight:700,lineHeight:1,fontVariantNumeric:'tabular-nums'}},i),React.createElement('span',{style:{fontFamily:"'Bricolage Grotesque'",fontSize:24,opacity:.75,letterSpacing:0}},c))};
const parseMoney=v=>{if(!v)return 0;let x=String(v).replace(/[^\d,.]/g,'');if(x.includes(','))x=x.replace(/\./g,'').replace(',','.');return parseFloat(x)||0};
const SRC_CAT=[['uber','Uber',null],['n99','99',null],['indrive','inDrive',null],['extra','Particular','ph-duotone ph-handshake'],['gorjeta','Gorjeta','ph-duotone ph-heart'],['bonus','Bônus dos apps','ph-duotone ph-gift'],['vendas','Vendas no carro','ph-duotone ph-shopping-bag']];
const ICON_IN=['ph-shopping-bag','ph-drop-half','ph-cookie','ph-coffee','ph-beer-bottle','ph-gift','ph-package','ph-storefront'];
const ICON_OUT=['ph-receipt','ph-coffee','ph-traffic-sign','ph-device-mobile','ph-first-aid-kit','ph-t-shirt','ph-ticket','ph-car-battery'];
const EXP0=[{name:'Combustível',icon:'ph-duotone ph-gas-pump'},{name:'Alimentação',icon:'ph-duotone ph-fork-knife'},{name:'Lavagem',icon:'ph-duotone ph-drop-half'},{name:'Manutenção',icon:'ph-duotone ph-wrench'},{name:'Pedágio',icon:'ph-duotone ph-road-horizon'},{name:'Estacionamento',icon:'ph-duotone ph-traffic-sign'}];
const POTS0=[{id:'carro',name:'Cofre do carro',icon:'ph-fill ph-car-profile',c:'accent',v:420,goal:650,kind:'carro'},{id:'casa',name:'Contas da casa',icon:'ph-fill ph-house-line',c:'cW',v:610,goal:0,kind:'casa'},{id:'reserva',name:'Reserva de emergência',icon:'ph-fill ph-lifebuoy',c:'pos',v:1850,goal:5000,kind:'reserva'},{id:'sonho',name:'Férias em janeiro',icon:'ph-fill ph-umbrella-simple',c:'gold',v:280,goal:2000,kind:'sonho'}];
const MOVES0=[{t:'Fechamento de ter 20',p:'Reserva de emergência',v:42},{t:'Fechamento de ter 20',p:'Contas da casa',v:91},{t:'Aluguel do carro pago',p:'Cofre do carro',v:-650},{t:'Fechamento de sáb 17',p:'Cofre do carro',v:118}];

class Component extends DCLogic {
  state={screen:'home',prev:'home',onbStep:0,period:'dia',vehicle:'alugado',energy:'flex',flexUse:'gasolina',fuel:JSON.parse(JSON.stringify(FUEL)),
    bills:BILLS0.map(b=>({...b})),wear:0.14,save:400,spend:1200,daysWeek:6,revKm:2.2,recs:genRecords(),
    paid:{'aluguel-carro:5':1,'aluguel-carro:12':1,'aluguel-carro:19':1,'aluguel-casa:5':1,'internet:10':1,'celular:10':1,'geladeira:15':1,'agua:18':1,'parcela-carro:15':1,'seguro:12':1},
    pots:POTS0.map(p=>({...p})),moves:MOVES0.slice(),billFilter:'todas',
    cl:{step:0,focus:'uber',f:{uber:'',n99:'',indrive:'',extra:'',km:''},h:9,sep:{carro:true,casa:true,reserva:true}},
    sh:{open:false,type:'in',digits:'',plat:'uber',cat:'Combustível',pot:'reserva',adding:false,newName:'',newIcon:''},
    sources:SRC_CAT.slice(0,5).map(([k,name,icon])=>({k,name,icon})),expCats:EXP0.map(x=>({...x})),nb:{name:'',icon:'ph-lightbulb',color:'#F2B544',cat:'casa',due:10},
    revKmMode:'auto',revKmManual:2.2,guide:true,seen:{},introSeen:{},todayExps:[{id:'e1',cat:'Alimentação',icon:'ph-duotone ph-fork-knife',v:24,time:'13:05'}],xp:1240,toast:null,sepDone:false,rem:{close:true,bills:true,rent:true,maint:true,week:true}};
  componentDidMount(){const p=this.props;const o={};const ss=p.startScreen||'';
    if(ss.startsWith('onb')){o.screen='onb';o.onbStep=+ss.slice(3)||0}
    else if(ss.startsWith('close')){const st=+ss.slice(5)||0;o.screen='close';o.cl={step:st>=2?1:st,focus:st>=1?'km':'uber',f:{uber:'241,80',n99:'112,50',indrive:'64,00',extra:'20,00',gorjeta:'',km:st>=1?'206':''},h:9,sep:{carro:true,casa:true,reserva:true}};
      if(st>=2){this.setState(o,()=>this.closeDay(true));return}}
    else if(ss)o.screen=ss;
    if(p.startPeriod)o.period=p.startPeriod;
    if(p.sheet==='bill')o.sh={open:true,type:'bill',digits:'18640',plat:'uber',cat:'Combustível',pot:'reserva'},o.nb={name:'Luz',icon:'ph-lightbulb',color:'#F2B544',cat:'casa',due:25},o.screen=o.screen||'bills';
    else if(p.sheet)o.sh={open:true,type:p.sheet,digits:p.sheet==='in'?'4250':'5000',plat:'uber',cat:'Alimentação',pot:'reserva'};
    this.setState(o);setTimeout(()=>this.checkScroll(),400)}
  checkScroll(){const el=this.scRef&&this.scRef.current;if(!el)return;const more=el.scrollHeight-el.clientHeight-el.scrollTop>90;if(more!==!!this.state.more)this.setState({more})}
  componentDidUpdate(){const sc=this.state.screen;if(this._lastScreen!==sc){this._lastScreen=sc;if(this.scRef.current)this.scRef.current.scrollTop=0}this.checkScroll()}
  componentWillUnmount(){clearTimeout(this.tt)}
  scRef=React.createRef();
  flash(m){clearTimeout(this.tt);this.setState({toast:m});this.tt=setTimeout(()=>this.setState({toast:null}),2300)}
  activeBills(s){return s.bills.filter(b=>b.on&&(!b.veh||(b.veh==='dono'?s.vehicle!=='alugado':b.veh===s.vehicle)))}
  occ(s){const L=[];this.activeBills(s).forEach(b=>{if(b.rec==='semanal'){for(let d=1;d<=MDAYS;d++)if(wd(d)===b.due)L.push({...b,d,oid:b.id+':'+d})}else if(!(b.user&&b.due<TODAY))L.push({...b,d:b.due,oid:b.id+':'+b.due})});return L.map(o=>({...o,paid:!!s.paid[o.oid]}))}
  calc(s){
    const ft=s.energy==='flex'?s.flexUse:s.energy, F=s.fuel[ft], fuelKm=F.price/F.eff;
    const mon=b=>b.rec==='semanal'?b.v*52/12:b.v;
    const act=this.activeBills(s);
    const carFixed=act.filter(b=>b.cat==='carro').reduce((a,b)=>a+mon(b),0);
    const life=act.filter(b=>b.cat!=='carro').reduce((a,b)=>a+mon(b),0);
    let planned=0;for(let d=1;d<=MDAYS;d++)if(mi(d)<s.daysWeek)planned++;
    const carShare=carFixed/planned, lifeShare=life/planned;
    const target=life+s.save+s.spend;
    const num=d=>{const r=s.recs[d];if(!r)return null;const g=Object.values(r.p).reduce((a,b)=>a+b,0),rg=rideSum(r.p);const km=r.closed?r.km:Math.round(rg/s.revKm);const en=km*fuelKm,we=km*s.wear,ex=r.exp||0;const lucro=g-en-we-ex-carShare;return{d,g,rg,km,h:r.h||Math.max(1,km/23),en,we,ex,car:carShare,lucro,life:lifeShare,sobra:lucro-lifeShare,closed:r.closed,p:r.p}};
    const agg=list=>{const o={g:0,rg:0,km:0,h:0,en:0,we:0,ex:0,car:0,lucro:0,life:0,sobra:0,n:0,p:{}};list.filter(Boolean).forEach(r=>{['g','rg','km','h','en','we','ex','car','lucro','life','sobra'].forEach(k=>o[k]+=r[k]);o.n++;Object.keys(r.p).forEach(k=>o.p[k]=(o.p[k]||0)+(r.p[k]||0))});return o};
    const closedDays=Object.keys(s.recs).map(Number).filter(d=>s.recs[d].closed);
    const month=agg(closedDays.map(num));
    const todayClosed=!!(s.recs[TODAY]&&s.recs[TODAY].closed);
    let rem=0;for(let d=todayClosed?TODAY+1:TODAY;d<=MDAYS;d++)if(mi(d)<s.daysWeek)rem++;
    const need=Math.max(0,target-month.lucro), dailyLucro=rem?need/rem:0, ckm=Math.max(.05,s.revKm-fuelKm-s.wear);
    const dailyGross=rem?(dailyLucro+carShare)/ckm*s.revKm:0;
    const targetFor=d=>{let before=0;closedDays.forEach(x=>{if(x<d)before+=num(x).lucro});let r=0;for(let k=d;k<=MDAYS;k++)if(mi(k)<s.daysWeek)r++;return r?Math.max(0,target-before)/r:0};
    const planDailyGross=((target+carFixed)/planned)/ckm*s.revKm;
    const avg=month.n?month.lucro/month.n:0, proj=month.lucro+avg*rem;
    return {targetFor,ft,F,fuelKm,carFixed,life,planned,carShare,lifeShare,target,num,agg,month,todayClosed,rem,need,dailyLucro,dailyGross,planDailyGross,proj,ckm};
  }
  closeDay(silent){const s=this.state,f=s.cl.f;const p={};s.sources.forEach(x=>p[x.k]=parseMoney(f[x.k]));const km=parseInt(f.km||'0',10)||0;if(km<=0)return;const prev=s.recs[TODAY]||{exp:0};
    this.setState(st=>({recs:{...st.recs,[TODAY]:{p,km,h:st.cl.h,exp:prev.exp||0,closed:true}},cl:{...st.cl,step:2},xp:st.xp+40}));if(!silent)this.flash('Dia fechado · +40 XP')}
  sepAmounts(s,C){const r=C.num(TODAY);if(!r)return{carro:0,casa:0,reserva:0,livre:0,en:0};const carro=r.car+r.we,casa=r.life,sob=Math.max(0,r.sobra),reserva=Math.round(sob*.15*100)/100;return{carro,casa,reserva,livre:Math.max(0,sob-reserva),en:r.en}}
  applySep(silent){const s=this.state,C=this.calc(s),a=this.sepAmounts(s,C),sp=s.cl.sep;const any=sp.carro||sp.casa||sp.reserva;
    this.setState(st=>({pots:st.pots.map(p=>sp[p.id]?{...p,v:p.v+a[p.id]}:p),moves:[...['carro','casa','reserva'].filter(k=>sp[k]).map(k=>({t:'Fechamento de hoje',p:st.pots.find(p=>p.id===k).name,v:a[k]})),...st.moves],cl:{...st.cl,step:3},xp:st.xp+(any?20:0),sepDone:any}));if(!silent)this.flash(any?'Separado · +20 XP':'Dia fechado')}
  eff(st){const ds=Object.keys(st.recs).map(Number).filter(d=>st.recs[d].closed);let rg=0,km=0,hh=0;ds.forEach(d=>{const r=st.recs[d];rg+=rideSum(r.p);km+=r.km||0;hh+=r.h||0});const learned=km?rg/km:2.2,perH=hh?rg/hh:25;return{...st,revKm:st.revKmMode==='manual'?st.revKmManual:+learned.toFixed(2),revLearned:learned,perH,learnDays:ds.length}}
  renderVals(){
    const t=TH[this.props.theme]||TH.noturno, s=this.eff(this.state), C=this.calc(s), set=o=>this.setState(o);
    const nav=sc=>()=>this.setState(st=>({screen:sc,prev:st.screen,seen:{...(st.seen||{}),[sc]:1}}));
    const enLabel=s.energy==='eletrico'?'Recarga':'Combustível';
    t.hsFade=t.hsFade||t.surface;t.hsArrow=t.hsArrow||t.muted;
    const sel=on=>({border:on?t.accent:t.line2,bg:on?t.accentSoft:t.surface,color:on?t.accent:t.ink});
    const stepper=(label,value,minus,plus)=>({label,value,minus,plus});
    const today=C.num(TODAY);
    const occ=this.occ(s);
    // ---- onboarding
    const os=s.onbStep, F=C.F, ft=C.ft;
    const setFuel=(k,dv)=>()=>this.setState(st=>({fuel:{...st.fuel,[ft]:{...st.fuel[ft],[k]:Math.max(k==='price'?.1:1,+(st.fuel[ft][k]+dv).toFixed(2))}}}));
    const etR=s.fuel.etanol.price/s.fuel.gasolina.price;
    const rentB=s.bills.find(b=>b.id==='aluguel-carro'), finB=s.bills.find(b=>b.id==='parcela-carro');
    const setBill=(id,dv)=>()=>this.setState(st=>({bills:st.bills.map(b=>b.id===id?{...b,v:Math.max(50,b.v+dv)}:b)}));
    const T=[null,['Seus apps','Onde você roda?','Marque só o que você usa. O fechamento do dia mostra apenas essas fontes.'],['Seu carro','Como é o seu carro?','Isso define as contas do carro que entram no cálculo.'],[s.energy==='eletrico'?'Recarga':'Combustível','O que vai no tanque?','Com preço e consumo, o Faro calcula quanto custa cada km.'],['Sua vida','Quais contas são suas?','O Faro organiza a casa também. Desligue o que não for seu.'],['Meta','Quanto você quer guardar e gastar?','A meta nasce das suas contas. Você só escolhe o resto.'],['Pronto','Seu Faro para outubro',`Com ${s.daysWeek} dias de pista por semana, são ${C.planned} dias no mês.`]];
    const lifeB=s.bills.filter(b=>b.cat!=='carro');
    const mon=b=>b.rec==='semanal'?b.v*52/12:b.v;
    const pdg=C.planDailyGross, pkm=pdg/s.revKm;
    const per=[[enLabel,C.fuelKm/s.revKm*100,t.accent],['Desgaste',s.wear/s.revKm*100,t.cW],['Carro fixo',C.carShare/pdg*100,t.cF],['Contas da vida',C.lifeShare/pdg*100,t.cL]];
    const sob=Math.max(0,100-per.reduce((a,b)=>a+b[1],0));
    let steppers=[];
    if(os===2){if(s.vehicle==='alugado')steppers=[stepper('Aluguel por semana · vence segunda',R(rentB.v),setBill('aluguel-carro',-25),setBill('aluguel-carro',25))];if(s.vehicle==='financiado')steppers=[stepper('Parcela por mês · dia 15',R(finB.v),setBill('parcela-carro',-50),setBill('parcela-carro',50))]}
    if(os===3)steppers=[stepper(`Preço por ${F.unit}`,R(F.price,2),setFuel('price',-.1),setFuel('price',.1)),stepper(`Rendimento (km/${F.unit})`,fmt(F.eff,1)+` km/${F.unit}`,setFuel('eff',-.5),setFuel('eff',.5))];
    if(os===5)steppers=[stepper('Guardar por mês',R(s.save),()=>set({save:Math.max(0,s.save-100)}),()=>set({save:s.save+100})),stepper('Pra gastar com você',R(s.spend),()=>set({spend:Math.max(0,s.spend-100)}),()=>set({spend:s.spend+100}))];
    const onbApps=SRC_CAT.map(([k,label,icon])=>{const on=s.sources.some(x=>x.k===k);return{label,icon:icon||'',logoUrl:LOGO[k]?`url("${LOGO[k]}")`:'none',imgD:LOGO[k]?'block':'none',icoD:LOGO[k]?'none':'flex',border:on?t.accent:t.line,bg:on?t.accentSoft:t.surface,check:on?'ph-fill ph-check-circle':'ph ph-circle',onClick:()=>this.setState(st=>{const has=st.sources.some(x=>x.k===k);if(has&&st.sources.length===1)return null;if(!has&&st.sources.length>=7)return null;return{sources:has?st.sources.filter(x=>x.k!==k):SRC_CAT.filter(c=>c[0]===k||st.sources.some(x=>x.k===c[0])).map(([k2,n2,i2])=>st.sources.find(x=>x.k===k2)||{k:k2,name:n2,icon:i2}).concat(st.sources.filter(x=>!SRC_CAT.some(c=>c[0]===x.k)))}})}});
    const onb={apps:onbApps,appsNote:`${s.sources.length} de 7 fontes. Vende algo no carro? Crie a fonte "Vendas no carro" no fechamento do dia.`,s0:os===0,inner:os>0,sApps:os===1,s1:os===2,s2:os===3,s3:os===4,s4:os===5,s5:os===6,count:`${os}/6`,kicker:T[os]?.[0],title:T[os]?.[1],sub:T[os]?.[2],
      pitch:[{icon:'ph-duotone ph-scales',text:'Bruto e lucro líquido, separados de verdade'},{icon:'ph-duotone ph-house-line',text:'Contas do carro e da casa no mesmo lugar'},{icon:'ph-duotone ph-bell-ringing',text:'Lembretes de contas e manutenção na hora certa'}],
      dots:[1,2,3,4,5,6].map(i=>({bg:i<=os?t.accent:t.line2})),
      next:()=>{if(os<6)set({onbStep:os+1});else{set({screen:'home',onbStep:0});this.flash('Seu Faro está pronto')}},back:()=>set({onbStep:Math.max(0,os-1)}),
      cta:os===6?'Entrar no Faro':'Continuar',ctaBg:os===6?t.gold:t.accent,ctaInk:os===6?t.goldInk:'#fff',
      vehicles:[['dono','Próprio','Quitado, sem parcela','ph-duotone ph-key'],['financiado','Financiado','Parcela todo mês','ph-duotone ph-bank'],['alugado','Alugado','Aluguel semanal para locadora','ph-duotone ph-car-profile']].map(([k,l,sub,icon])=>{const on=s.vehicle===k;return{label:l,sub,icon,border:on?t.accent:t.line,bg:on?t.accentSoft:t.surface,iconBg:on?t.accent:t.surface2,iconColor:on?'#fff':t.accent,check:on?'ph-fill ph-check-circle':'ph ph-circle',onClick:()=>set({vehicle:k})}}),
      energies:ENERGIES.map(([k,l,icon])=>({label:l,icon,...sel(s.energy===k),onClick:()=>set({energy:k})})),isFlex:s.energy==='flex',
      flexTabs:['gasolina','etanol'].map(k=>({label:FUEL[k].label,bg:s.flexUse===k?t.surface:'transparent',color:s.flexUse===k?t.ink:t.muted,onClick:()=>set({flexUse:k})})),
      energyTip:s.energy==='flex'?`Etanol está a ${Math.round(etR*100)}% da gasolina. ${etR<=.7?'Abaixo de 70%: etanol compensa.':'Acima de 70%: gasolina compensa.'}`:`Cada km rodado gasta em ${enLabel.toLowerCase()}`,energyKm:R(C.fuelKm,2)+'/km',
      bills:lifeB.map(b=>({name:b.name,icon:'ph-fill '+b.icon,color:b.color,sub:`${b.rec} · dia ${b.due}`,value:R(b.v,b.v%1?2:0),op:b.on?'1':'.5',trk:b.on?t.accent:t.line2,knob:b.on?'21px':'3px',onToggle:()=>this.setState(st=>({bills:st.bills.map(x=>x.id===b.id?{...x,on:!x.on}:x)}))})),
      steppers,dayTabs:[4,5,6,7].map(n=>({label:n+' dias',bg:s.daysWeek===n?t.accent:'transparent',color:s.daysWeek===n?'#fff':t.muted,onClick:()=>set({daysWeek:n})})),
      dailyGross:fmt(pdg,0),planChips:[{label:'Rodar',value:`≈ ${Math.round(pkm)} km`},{label:'Online',value:`≈ ${fmt(pkm/23,0)} h`},{label:'Dias no mês',value:String(C.planned)}],
      split:[...per.map(([l,v,c])=>({label:l,v:fmt(v,0),w:v+'%',color:c})),{label:'Sobra pra você',v:fmt(sob,0),w:sob+'%',color:t.pos}]};
    const goalStack=[{icon:'ph-fill ph-house-line',color:t.cL,label:'Contas da vida',value:R(C.life)},{icon:'ph-fill ph-vault',color:t.pos,label:'Guardar',value:R(s.save)},{icon:'ph-fill ph-smiley',color:t.gold,label:'Pra gastar com você',value:R(s.spend)}];
    const goalTotal=R(C.target);
    // ---- home
    const P=s.period;let view;
    if(P==='dia')view=C.agg([today]);
    else if(P==='semana'){const ds=[];for(let d=19;d<=25;d++)ds.push(C.num(d));view=C.agg(ds.filter(x=>x&&(x.closed||x.d===TODAY)))}
    else view=C.agg([...Object.keys(s.recs).map(Number).filter(d=>s.recs[d].closed).map(C.num),...(C.todayClosed?[]:[today])]);
    const [hi,hc]=split(view.lucro), carCost=view.en+view.we+view.car+view.ex;
    const hb={dia:C.todayClosed?['Lucro líquido de hoje','ph-bold ph-check',`Dia fechado · ${view.km} km`]:['Lucro líquido estimado','ph-bold ph-clock','Feche o dia para o valor real'],semana:['Lucro líquido da semana','ph-bold ph-calendar',`${view.n} de ${s.daysWeek} dias · seg 19 a dom 25`],mes:['Lucro líquido de outubro','ph-bold ph-trend-up',`${view.n} dias rodados · ${C.rem} pela frente`]}[P];
    const h={num:React.createElement(CountUp,{value:+view.lucro.toFixed(2)}),label:hb[0],int:hi,cents:hc,badgeIcon:hb[1],badge:hb[2],chips:[{icon:'ph-bold ph-arrow-down-left',color:'#5EE6A8',label:'Bruto',value:R(view.g)},{icon:'ph-bold ph-arrow-up-right',color:'#FF9A9A',label:'Carro',value:R(carCost)},{icon:'ph-fill ph-wallet',color:t.gold,label:'Sobra',value:R(view.sobra)}]};
    const periods=[['dia','Hoje'],['semana','Semana'],['mes','Mês']].map(([k,l])=>({label:l,bg:P===k?'#fff':'transparent',color:P===k?'#0D1530':'#fff',onClick:()=>set({period:k})}));
    const openSheet=(type,extra)=>()=>this.setState(st=>({sh:{...st.sh,open:true,type,digits:'',editId:null,...(extra||{})}}));
    const glass='rgba(255,255,255,.12)',gb='transparent';
    const actions=[{label:'Ganho',icon:'ph-bold ph-arrow-down-left',onClick:openSheet('in'),bg:glass,border:gb,color:'#5EE6A8'},{label:'Gasto',icon:'ph-bold ph-arrow-up-right',onClick:openSheet('out'),bg:glass,border:gb,color:'#FF9A9A'},
      C.todayClosed?{label:'Resumo',icon:'ph-fill ph-check-circle',onClick:()=>set({screen:'close',cl:{...s.cl,step:2}}),bg:glass,border:gb,color:t.gold}:{label:'Fechar dia',icon:'ph-fill ph-flag-checkered',onClick:()=>this.openClose(),bg:glass,border:gb,color:t.gold}];
    const dayLucro=C.targetFor(TODAY), goalG=(dayLucro+C.carShare)/C.ckm*s.revKm;
    const tg=today?today.g:0, gp=Math.min(100,Math.round(tg/Math.max(1,goalG)*100));
    const kmG=goalG/s.revKm;
    const dg={sub:C.todayClosed?'dia fechado · amanhã ela se ajusta':`fature isso pra lucrar ${R(dayLucro)} limpos`,explain:`São ≈ ${Math.round(kmG)} km. A meta já cobre ${R(kmG*C.fuelKm)} de ${enLabel.toLowerCase()}, o desgaste${s.vehicle==='alugado'?' e a parte do aluguel':''}. Passou disso, é lucro.`,pct:gp,w:gp+'%',done:R(tg),goal:R(goalG),left:tg>=goalG?'Meta batida':`Faltam ${R(goalG-tg)}`,chips:[{label:'Rodar',value:`≈ ${Math.round(kmG)} km`},{label:enLabel,value:`≈ ${R(kmG*C.fuelKm)}`},{label:'Lucro limpo',value:R(dayLucro)}]};
    const pay=(oid,v)=>()=>{this.setState(st=>{const p={...st.paid};if(v)p[oid]=1;else delete p[oid];return{paid:p,xp:v?st.xp+10:st.xp}});if(v)this.flash('Conta paga · +10 XP')};
    const status=o=>{const dd=o.d-TODAY;return o.paid?`paga · dia ${o.d}`:dd<0?`venceu há ${-dd} dia${-dd>1?'s':''}`:dd===0?'vence hoje':dd===1?'vence amanhã':`vence em ${dd} dias · dia ${o.d}`};
    const scol=o=>{const dd=o.d-TODAY;return o.paid?t.muted:dd<0?t.neg:dd<=5?t.gold:t.muted};
    const pend=occ.filter(o=>!o.paid).sort((a,b)=>a.d-b.d), over=pend.filter(o=>o.d<TODAY);
    const alert={show:over.length>0,title:over.length?`${over[0].name} venceu ${TODAY-over[0].d===1?'ontem':'há '+(TODAY-over[0].d)+' dias'}`:'',sub:over.length?`${R(over[0].v,2)} · toque se já pagou`:'',onClick:over.length?pay(over[0].oid,true):null};
    const nextBills=pend.filter(o=>o.d>=TODAY).slice(0,3).map(o=>({name:o.name,icon:'ph-fill '+o.icon,color:o.color,value:R(o.v,2),status:status(o),sc:scol(o),onPay:pay(o.oid,true)}));
    // week
    const wkR=[];for(let d=19;d<=25;d++)wkR.push(C.num(d));
    const wkC=C.agg(wkR.filter(x=>x&&x.closed));
    let wk;
    if(s.vehicle==='alugado'){const cov=wkC.g-wkC.en-wkC.we-wkC.ex;const pc=Math.max(0,Math.min(100,Math.round(cov/rentB.v*100)));wk={icon:'ph-duotone ph-car-profile',title:'Aluguel da semana',sub:`${R(rentB.v)} · vence segunda`,pct:pc,w:pc+'%',note:pc>=100?'Aluguel já coberto. O resto da semana é seu.':`Faltam ${R(rentB.v-cov)} para cobrir o aluguel.`}}
    else{const wt=C.target/C.planned*s.daysWeek;const pc=Math.max(0,Math.min(100,Math.round(wkC.lucro/wt*100)));wk={icon:'ph-duotone ph-target',title:'Meta da semana',sub:R(wt)+' de lucro',pct:pc,w:pc+'%',note:`${R(wkC.lucro)} de lucro até agora.`}}
    const wmax=Math.max(250,...wkR.filter(Boolean).map(r=>r.lucro));
    const weekBars=wkR.map((r,i)=>{const d=19+i,off=mi(d)>=s.daysWeek,isT=d===TODAY;if(r&&r.closed)return{day:WD[wd(d)],val:fmt(r.lucro,0),h:Math.max(8,r.lucro/wmax*100)+'px',bg:r.lucro>=C.target/C.planned?t.pos:t.gold,border:'none',lc:t.ink,fw:'800'};return{day:WD[wd(d)],val:off?'folga':isT?'hoje':'',h:off?'8px':'40px',bg:isT?t.goldSoft:'transparent',border:off?'none':`1.5px dashed ${isT?t.gold:t.line2}`,lc:isT?t.gold:t.muted,fw:isT?'800':'600'}});
    // month
    const RC=2*Math.PI*34, mp=Math.max(0,Math.min(100,Math.round(C.month.lucro/C.target*100))), ahead=C.proj>=C.target;
    const M=C.month, mg=Math.max(1,M.g);
    const mo={pct:mp,dash:`${RC*mp/100} ${RC}`,of:`${R(M.lucro)} de ${R(C.target)}`,pace:ahead?`No ritmo · projeção ${R(C.proj)}`:`Atrás · projeção ${R(C.proj)}`,paceColor:ahead?t.pos:t.gold,gross:R(M.g),
      split:[[enLabel,M.en,t.accent],['Carro e desgaste',M.car+M.we,t.cW],['Gastos na rua',M.ex,t.cF],['Lucro líquido',Math.max(0,M.lucro),t.pos]].map(([l,v,c])=>({label:l,v:R(v),w:(v/mg*100)+'%',color:c}))};
    // waterfall
    const base=Math.max(1,view.g);let acc=0;
    const row=(label,icon,v,color,neg)=>{const w=v/base*100,ml=neg?acc:0;if(neg)acc+=w;return{label,icon,value:(neg?'− ':'')+R(v,2),color,w:w+'%',ml:ml+'%',fw:'700',vc:t.ink,barD:'block',pad:'0',rowBg:'transparent'}};
    const total=(label,icon,v,color)=>({label,icon,value:R(v,2),color,w:'0',ml:'0',fw:'800',vc:color,barD:'none',pad:'10px 12px',rowBg:t.surface2});
    const rows=[row('Bruto dos apps','ph-fill ph-arrow-circle-down',view.g,t.accent,false),row(`Energia · ${R(C.fuelKm,2)}/km`,'ph-fill ph-gas-pump',view.en,t.gold,true),row(`Desgaste · ${R(s.wear,2)}/km`,'ph-fill ph-wrench',view.we,t.cW,true),row('Carro fixo (rateio)','ph-fill ph-car-profile',view.car,t.cF,true),row('Gastos na rua','ph-fill ph-fork-knife',view.ex,'#FF8F8F',true),total('Lucro líquido','ph-fill ph-steering-wheel',view.lucro,t.ink)];
    rows.push(row('Contas da vida (rateio)','ph-fill ph-house-line',view.life,t.cL,true));
    rows.push(total('Sobra pra guardar e viver','ph-fill ph-wallet',view.sobra,t.pos));
    const costT=view.en+view.we+view.car+view.ex, lucT=Math.max(0,view.lucro);
    const carFixLabel=s.vehicle==='alugado'?'Aluguel do carro · parte do dia':s.vehicle==='financiado'?'Parcela e seguro · parte do dia':'Seguro · parte do dia';
    const partial=P==='dia'&&!C.todayClosed;
    const wf={title:partial?'Do bruto ao lucro (estimativa)':'Do bruto ao lucro',exps:(s.todayExps||[]).map((x,i,a)=>({cat:x.cat,icon:x.icon,time:x.time,value:'− '+R(x.v,2),note:x.cat==='Combustível'?'só mede o consumo, não desconta':'',noteD:x.cat==='Combustível'?'block':'none',vc:x.cat==='Combustível'?t.muted:t.ink,onEdit:()=>this.setState(st=>({sh:{...st.sh,open:true,type:'out',adding:false,digits:String(Math.round(x.v*100)),cat:x.cat,editId:x.id}})),onDel:()=>{this.setState(st=>{const r={...st.recs[TODAY]};if(x.cat!=='Combustível')r.exp=Math.max(0,(r.exp||0)-x.v);return{recs:{...st.recs,[TODAY]:r},todayExps:st.todayExps.filter(y=>y.id!==x.id)}});this.flash(`${x.cat} removido`)}})),hasExps:P==='dia'&&(s.todayExps||[]).length>0,noExps:P==='dia'&&!(s.todayExps||[]).length,addExp:()=>this.setState(st=>({sh:{...st.sh,open:true,type:'out',adding:false,digits:'',editId:null}})),you:view.g>0?`você fica com ${Math.max(0,Math.round(view.lucro/base*100))}% do bruto`:'',open:!!s.wfOpen,toggle:()=>set({wfOpen:!s.wfOpen}),toggleLabel:s.wfOpen?'Esconder detalhes':(P==='dia'?'Ver detalhes do dia':'Ver a conta'),toggleIcon:s.wfOpen?'ph-bold ph-caret-up':'ph-bold ph-caret-down',
      bar:[[costT,t.neg],[lucT,t.pos]].map(([v,c])=>({w:(v/base*100)+'%',color:c})),
      keys:[{label:'Bruto',value:R(view.g),color:t.line2,vc:t.ink},{label:'Custos',value:R(costT),color:t.neg,vc:t.ink},{label:partial?'Lucro estimado':'Lucro líquido',value:R(view.lucro),color:t.pos,vc:view.lucro>=0?t.pos:t.neg}],
      rows:[{label:'Bruto dos apps',icon:'ph-fill ph-arrow-circle-down',color:t.ink,value:R(view.g,2),vc:t.ink,fw:'700'},{label:`${enLabel} · ${R(C.fuelKm,2)}/km`,icon:'ph-fill ph-gas-pump',color:t.accent,value:'− '+R(view.en,2),vc:t.ink,fw:'600'},{label:`Desgaste · ${R(s.wear,2)}/km`,icon:'ph-fill ph-wrench',color:t.cW,value:'− '+R(view.we,2),vc:t.ink,fw:'600'},{label:carFixLabel,icon:'ph-fill ph-car-profile',color:t.cF,value:'− '+R(view.car,2),vc:t.ink,fw:'600'},{label:P==='dia'?'Gastos lançados hoje':'Gastos lançados',icon:'ph-fill ph-receipt',color:t.cF,value:'− '+R(view.ex,2),vc:t.ink,fw:'600'},{label:'Lucro líquido',icon:'ph-fill ph-check-circle',color:t.pos,value:R(view.lucro,2),vc:view.lucro>=0?t.pos:t.neg,fw:'800'}]};
    const lifeCard={lucro:R(M.lucro),contas:'− '+R(M.life),livre:R(M.sobra),livreColor:M.sobra>=0?t.pos:t.neg,note:M.sobra>=0?'É isso que fica pra guardar e pra viver. O Faro sugere quanto separar em cada fechamento.':'As contas do mês ainda passam do lucro. Os dias que faltam vão cobrir a diferença.'};
    const km=Math.max(1,view.km),hr=Math.max(1,view.h);
    const metricsAll=[{icon:'ph-duotone ph-arrow-circle-down',label:'Bruto por km',value:R(view.rg/km,2),hint:`média ${R(s.revKm,2)}`,hc:view.rg/km>=s.revKm?t.pos:t.muted},{icon:'ph-duotone ph-coins',label:'Custo por km',value:R((view.en+view.we+view.car)/km,2),hint:'energia + desgaste + carro',hc:t.muted},{icon:'ph-duotone ph-path',label:'Lucro líquido/km',value:R(view.lucro/km,2),hint:view.lucro/km>=1?'acima de R$ 1,00 · ótimo':'abaixo de R$ 1,00',hc:view.lucro/km>=1?t.pos:t.gold},{icon:'ph-duotone ph-timer',label:'Lucro por hora',value:R(view.lucro/hr,2),hint:`${fmt(view.h,1)} h · ${fmt(view.km,0)} km`,hc:t.muted}];
    const metrics=[metricsAll[2],metricsAll[1],metricsAll[3]].map(m=>({...m,label:m.label.replace(' por ','/').replace('Lucro líquido/km','Lucro/km')}));
    const PC={uber:this.props.theme==='dia'?'#111':'#E9EDF5',n99:'#FFD43B',indrive:'#B7F34A',extra:t.accent};
    const plats=s.sources.map(x=>[x.k,x.name]).map(([k,n])=>{const v=view.p[k]||0;return{name:n,value:R(v,2),pct:Math.round(v/base*100)+'%',w:(v/base*100)+'%',color:PC[k],logo:LOGO[k]||'',hasLogo:!!LOGO[k],logoUrl:LOGO[k]?`url("${LOGO[k]}")`:'none',imgD:LOGO[k]?'block':'none',icoD:LOGO[k]?'none':'flex'}});
    const rentLeft=s.vehicle==='alugado'?Math.max(0,rentB.v-(wkC.g-wkC.en-wkC.we-wkC.ex)):0;
    const tip=P==='dia'?(over.length?{show:false}:(s.vehicle==='alugado'&&rentLeft>0&&wd(TODAY)>=3)?{show:true,title:'Aluguel de segunda',text:`Faltam ${R(rentLeft)} do aluguel desta semana. No seu ritmo, dá para cobrir até sábado.`}:{show:true,title:'Seu horário de ouro',text:`Sexta das 18h às 22h foi seu melhor lucro por hora no mês: ${R(s.perH*1.35,0)}/h.`}):P==='semana'?{show:true,title:rentLeft>0?'Aluguel antes do lucro':'Semana livre',text:rentLeft>0?`Faltam ${R(rentLeft)} pro aluguel de segunda. Te lembro no domingo à noite.`:'O aluguel desta semana já saiu do lucro. A partir daqui, cada corrida vai para o seu bolso.'}:{show:true,title:'Menos km, mais lucro',text:'Nos dias com mais de 230 km seu lucro por km caiu. Rodar menos e melhor pode render mais.'};
    // gamification
    let streak=0;for(let d=C.todayClosed?TODAY:TODAY-1;d>=1;d--){if(mi(d)>=s.daysWeek)continue;if(s.recs[d]&&s.recs[d].closed)streak++;else break}
    const lv=[[0,'Primeira volta'],[300,'Na pista'],[600,'Rodagem firme'],[900,'Motorista de rota'],[1150,'Faro afiado'],[1500,'Faro de ouro'],[2000,'Lenda da pista']];
    let li=0;lv.forEach((l,i)=>{if(s.xp>=l[0])li=i});const nx=lv[li+1]||[s.xp+1,''];
    const game={streak,bestStreak:Math.max(streak,9),level:li+1,levelName:lv[li][1],xp:s.xp,xpW:Math.min(100,(s.xp-lv[li][0])/(nx[0]-lv[li][0])*100)+'%',nextLv:nx[1]?`${nx[0]-s.xp} XP para ${nx[1]}`:''};
    let workSoFar=0,closedSoFar=0;for(let d=1;d<=(C.todayClosed?TODAY:TODAY-1);d++){if(mi(d)<s.daysWeek){workSoFar++;if(s.recs[d]&&s.recs[d].closed)closedSoFar++}}
    const due=occ.filter(o=>o.d<TODAY), paidOn=due.filter(o=>o.paid).length;
    const reserva=s.pots.find(p=>p.id==='reserva');
    const lifeDay=(C.life+C.carFixed)/30, folego=reserva.v/lifeDay;
    const lkm=M.lucro/Math.max(1,M.km);
    const pil=[{icon:'ph-fill ph-calendar-check',label:'Constância',score:Math.round(closedSoFar/Math.max(1,workSoFar)*100),color:t.gold,hint:`${closedSoFar} de ${workSoFar} dias fechados no mês`},{icon:'ph-fill ph-path',label:'Lucro líquido por km',score:Math.round(Math.min(100,lkm/1.2*100)),color:t.accent,hint:`${R(lkm,2)}/km · referência ${R(1.2,2)}`},{icon:'ph-fill ph-receipt',label:'Contas em dia',score:Math.round(paidOn/Math.max(1,due.length)*100),color:t.pos,hint:due.length-paidOn?`${due.length-paidOn} conta atrasada`:'nenhuma atrasada'},{icon:'ph-fill ph-trend-up',label:'Ritmo da meta',score:Math.round(Math.min(100,C.proj/C.target*100)),color:t.cL,hint:`projeção ${R(C.proj)} de ${R(C.target)}`}];
    const score=Math.round(pil.reduce((a,b)=>a+b.score,0)/4);
    const idx={score,label:score>=85?'Excelente':score>=70?'Bom':score>=50?'Regular':'Atenção',next:score>=85?'Você está no topo. Mantenha a constância.':`Faltam ${85-score} pontos para Excelente. ${due.length-paidOn?'Pague a conta atrasada.':'Feche todos os dias de pista.'}`,pillars:pil.map(p=>({...p,w:p.score+'%'}))};
    const cal=[];for(let i=0;i<mi(1);i++)cal.push({n:'',bg:'transparent',color:'transparent',border:'none',op:'1'});
    for(let d=1;d<=MDAYS;d++){const r=s.recs[d],off=mi(d)>=s.daysWeek,c=C.num(d);
      if(r&&r.closed){const hit=c.lucro>=C.targetFor(d);cal.push({n:d,bg:hit?t.pos:t.gold,color:hit?t.posInk:t.goldInk,border:'none',op:'1'})}
      else if(d===TODAY)cal.push({n:d,bg:'transparent',color:t.ink,border:`2px solid ${t.gold}`,op:'1'});
      else if(off)cal.push({n:d,bg:'transparent',color:t.muted,border:'none',op:'.45'});
      else if(d<TODAY)cal.push({n:d,bg:'transparent',color:t.neg,border:`1.5px solid ${t.neg}`,op:'1'});
      else cal.push({n:d,bg:t.surface2,color:t.muted,border:'none',op:'1'})}
    const closedList=Object.keys(s.recs).map(Number).filter(d=>s.recs[d].closed).map(C.num);
    const best=closedList.slice().sort((a,b)=>b.lucro-a.lucro)[0], bestKm=closedList.slice().sort((a,b)=>b.lucro/b.km-a.lucro/a.km)[0];
    const records=[{icon:'ph-fill ph-trophy',v:best?R(best.lucro):'—',l:`melhor dia · ${best?best.d+' out':''}`},{icon:'ph-fill ph-path',v:bestKm?R(bestKm.lucro/bestKm.km,2):'—',l:'melhor lucro/km'},{icon:'ph-fill ph-fire',v:game.bestStreak+' dias',l:'maior sequência'}];
    const badges=[{icon:'ph-fill ph-flag-checkered',name:'Primeiro fechamento',sub:'fechou um dia',got:true},{icon:'ph-fill ph-fire',name:'Semana cheia',sub:'6 dias seguidos',got:streak>=6},{icon:'ph-fill ph-path',name:'Km de ouro',sub:'lucro acima de R$ 1,20/km num dia',got:!!bestKm&&bestKm.lucro/bestKm.km>=1.2},{icon:'ph-fill ph-wallet',name:'Mês no azul',sub:'sobra positiva no mês',got:M.sobra>0},{icon:'ph-fill ph-receipt',name:'Mês sem atraso',sub:'todas as contas em dia',got:due.length===paidOn},{icon:'ph-fill ph-calendar-check',name:'Constância de ouro',sub:'90% dos dias fechados',got:closedSoFar/Math.max(1,workSoFar)>=.9}].map(b=>({...b,bg:b.got?t.gold:t.surface2,color:b.got?t.goldInk:t.muted,op:b.got?'1':'.55'}));
    const shortcuts=[{icon:'ph-duotone ph-target',label:'Plano do mês',sub:`meta ${R(C.target)} · ${R(C.dailyGross)}/dia`,onClick:nav('plan')},{icon:'ph-duotone ph-car-profile',label:'Meu carro',sub:`custo ${R((M.en+M.we+M.car)/Math.max(1,M.km),2)}/km · energia e manutenção`,onClick:nav('car')}];
    // plan
    const RP=2*Math.PI*84;
    const openSet=type=>()=>this.setState(st=>({sh:{...st.sh,open:true,type,adding:false}}));
    const lifeN=this.activeBills(s).filter(b=>b.cat!=='carro').length;
    const pl={edit:openSet('plan'),stack:[{icon:'ph-fill ph-house-line',color:t.cL,label:'Contas da casa e pessoais',sub:`${lifeN} contas · toque para ver`,value:R(C.life),onClick:()=>set({screen:'bills',billFilter:'todas',prev:'plan'}),caret:'ph-bold ph-caret-right'},{icon:'ph-fill ph-vault',color:t.pos,label:'Guardar',sub:'você escolhe',value:R(s.save),onClick:openSet('plan'),caret:'ph-bold ph-pencil-simple'},{icon:'ph-fill ph-smiley',color:t.gold,label:'Pra gastar com você',sub:'você escolhe',value:R(s.spend),onClick:openSet('plan'),caret:'ph-bold ph-pencil-simple'}],
      rhythm:[{icon:'ph-fill ph-path',label:'Ganho médio por km',sub:s.revKmMode==='manual'?'definido por você':`aprendido de ${s.learnDays} dias`,value:R(s.revKm,2),onClick:openSet('plan')},{icon:'ph-fill ph-coins',label:'Custo por km do carro',sub:'combustível, desgaste e carro fixo · em Carro',value:R(C.fuelKm+s.wear+C.carShare/Math.max(1,C.dailyGross/s.revKm),2),onClick:nav('car')},{icon:'ph-fill ph-calendar',label:'Dias de pista',sub:`${C.rem} dias até o fim do mês`,value:`${s.daysWeek}/sem`,onClick:openSet('plan')}],
      dash:`${RP*mp/100} ${RP}`,paceBg:ahead?'rgba(61,220,151,.2)':'rgba(233,176,75,.2)',paceInk:ahead?'#7FF0BE':'#FFD77A',paceIcon:ahead?'ph-bold ph-check':'ph-bold ph-warning',
      steppers:[stepper('Guardar por mês',R(s.save),()=>set({save:Math.max(0,s.save-100)}),()=>set({save:s.save+100})),stepper('Pra gastar com você',R(s.spend),()=>set({spend:Math.max(0,s.spend-100)}),()=>set({spend:s.spend+100}))],
      need:[{icon:'ph-bold ph-arrow-down-left',label:'Faturar por dia',value:R(C.dailyGross)},{icon:'ph-bold ph-path',label:'Rodar por dia',value:`${Math.round(C.dailyGross/s.revKm)} km`},{icon:'ph-bold ph-calendar',label:'Dias restantes',value:String(C.rem)},{icon:'ph-bold ph-steering-wheel',label:'Lucro por dia',value:R(C.dailyLucro)}],
      explain:`Faltam ${R(C.need)} de lucro líquido. Dividindo pelos ${C.rem} dias de pista que sobram, cada dia precisa render ${R(C.dailyLucro)} depois do carro. Fechou um dia, o número se ajusta.`,
      dayTabs:[4,5,6,7].map(n=>({label:n+'×/sem',bg:s.daysWeek===n?t.surface:'transparent',color:s.daysWeek===n?t.ink:t.muted,onClick:()=>set({daysWeek:n})})),wd:['S','T','Q','Q','S','S','D'],cal};
    // bills
    const flt=s.billFilter, inF=o=>flt==='todas'||o.cat===flt;
    const tot=occ.reduce((a,b)=>a+b.v,0),pd=occ.filter(o=>o.paid).reduce((a,b)=>a+b.v,0);
    const pendL=occ.filter(o=>!o.paid&&inF(o)).sort((a,b)=>a.d-b.d), paidL=occ.filter(o=>o.paid&&inF(o)).sort((a,b)=>b.d-a.d);
    const bl={total:R(tot,2),paid:R(pd,2),left:R(tot-pd,2),w:(pd/Math.max(1,tot)*100)+'%',
      filters:[['todas','Todas'],...CATS].map(([k,l])=>{const v=occ.filter(o=>k==='todas'||o.cat===k).reduce((a,b)=>a+b.v,0);const on=flt===k;return{label:l,v:R(v),bg:on?'#fff':'rgba(255,255,255,.08)',color:on?'#0D1530':'#fff',border:on?'#fff':'rgba(255,255,255,.16)',onClick:()=>set({billFilter:k})}}),
      pending:pendL.map(o=>({name:o.name,icon:'ph-fill '+o.icon,color:o.color,value:R(o.v,2),status:status(o)+' · '+o.rec,sc:scol(o),line:o.d<TODAY?t.negLine:t.line,onPay:pay(o.oid,true)})),
      paidList:paidL.map((o,i)=>({name:o.name,icon:'ph-fill '+o.icon,color:o.color,value:R(o.v,2),status:`pago · dia ${o.d}`,sep:i===paidL.length-1?'transparent':t.line,onUndo:pay(o.oid,false)}))};
    // pots
    const casaNeed=pend.filter(o=>o.cat!=='carro').reduce((a,b)=>a+b.v,0), carNeed=pend.filter(o=>o.cat==='carro').slice(0,1).reduce((a,b)=>a+b.v,0)||rentB.v;
    const pots={days:fmt(folego,0),fw:Math.min(100,folego/30*100)+'%',total:R(s.pots.reduce((a,b)=>a+b.v,0)),
      give:openSheet('pot',{potDir:'in'}),take:openSheet('pot',{potDir:'out'}),add:()=>this.flash('Novo cofre: nome, meta e cor'),
      list:s.pots.map(p=>{const goal=p.kind==='casa'?casaNeed:p.kind==='carro'?carNeed:p.goal;const pc=Math.min(100,p.v/Math.max(1,goal)*100);const ok=p.v>=goal;
        const hint=p.kind==='carro'?(ok?'Aluguel de segunda garantido':`Faltam ${R(goal-p.v)} para o aluguel de segunda`):p.kind==='casa'?(ok?'Contas do mês cobertas':`Faltam ${R(goal-p.v)} para as contas até dia 28`):p.kind==='reserva'?`${fmt(folego,0)} dias de fôlego · meta 30 dias`:`${fmt(pc,0)}% · faltam ${R(goal-p.v)}`;
        return{name:p.name,icon:p.icon,color:t[p.c],v:R(p.v),goal:R(goal),w:pc+'%',sub:{carro:'aluguel, manutenção e imprevistos',casa:'o que vence este mês',reserva:'seu fôlego para dias parados',sonho:'objetivo pessoal'}[p.kind],hint,hc:ok?t.pos:t.muted,hIcon:ok?'ph-bold ph-check-circle':'ph-bold ph-info'}}),
      moves:s.moves.slice(0,5).map((m,i,a)=>({title:m.p,sub:m.t,v:(m.v>=0?'+ ':'− ')+R(Math.abs(m.v),2),icon:m.v>=0?'ph-fill ph-arrow-circle-down':'ph-fill ph-arrow-circle-up',color:m.v>=0?t.pos:t.neg,sep:i===a.length-1?'transparent':t.line}))};
    // reminders
    const rp=s.rem, dl=d=>d===TODAY?'Hoje':d===TODAY+1?'Amanhã':WD[wd(d)];
    const its=[];
    if(rp.close&&!C.todayClosed)its.push({d:TODAY,time:'22:00',icon:'ph-fill ph-flag-checkered',color:t.gold,title:'Fechar o dia',sub:'30 segundos: apps, km e horas'});
    occ.filter(o=>!o.paid).forEach(o=>{const isRent=o.id==='aluguel-carro'||o.id==='parcela-carro';
      if(isRent){if(rp.rent&&o.d>=TODAY&&o.d<=TODAY+8)its.push({d:Math.max(TODAY,o.d-1),time:'20:00',icon:'ph-fill ph-car-profile',color:t.accent,title:o.id==='aluguel-carro'?'Deixar o aluguel separado':'Parcela do carro amanhã',sub:`${R(o.v)} · vence ${WD[wd(o.d)].toLowerCase()} ${o.d}`});return}
      if(!rp.bills)return;
      if(o.d<TODAY)its.push({d:TODAY,time:'09:00',icon:'ph-fill ph-warning-circle',color:t.neg,title:`${o.name} atrasada`,sub:`${R(o.v,2)} · venceu dia ${o.d}`});
      else if(o.d<=TODAY+9)its.push({d:Math.max(TODAY,o.d-2),time:'09:00',icon:'ph-fill '+o.icon,color:o.color,title:`${o.name} vence dia ${o.d}`,sub:R(o.v,2)})});
    if(rp.maint)its.push({d:TODAY+3,time:'',icon:'ph-fill ph-drop',color:t.neg,title:'Troca de óleo chegando',sub:'faltam 620 km · uns 3 dias de pista'});
    if(rp.week)its.push({d:25,time:'19:00',icon:'ph-fill ph-chart-bar',color:t.cW,title:'Resumo da semana',sub:'lucro, lucro/km e o que vem pela frente'});
    const items=its.filter(x=>x.d<=TODAY+7).sort((a,b)=>a.d-b.d||(a.time||'99').localeCompare(b.time||'99'));
    const perDaySave=Math.max(0,M.sobra/Math.max(1,M.n)*.15), resGoal=C.life+C.carFixed, months=perDaySave>0?resGoal/(perDaySave*C.planned):0;
    const prefDefs=[['close','Fechar o dia','todo dia de pista às 22h','ph-duotone ph-flag-checkered'],['bills','Contas','2 dias antes do vencimento','ph-duotone ph-receipt'],...(s.vehicle==='dono'?[]:[['rent',s.vehicle==='alugado'?'Aluguel do carro':'Parcela do carro','na véspera, às 20h','ph-duotone ph-car-profile']]),['maint','Manutenção','500 km antes','ph-duotone ph-wrench'],['week','Resumo da semana','domingo às 19h','ph-duotone ph-chart-bar']];
    const rm={count:items.length,badgeD:items.length?'flex':'none',next:items[0]?{...items[0],when:`${dl(items[0].d).toLowerCase()}${items[0].time?' às '+items[0].time:''}`}:{icon:'ph-fill ph-check',when:'—',title:'Tudo em dia',sub:''},
      items:items.map((x,i)=>({...x,day:dl(x.d),dnum:x.d,dc:x.d===TODAY?t.gold:t.muted,sep:i===items.length-1?'transparent':t.line})),
      resGoal:R(resGoal),resText:`Guardando ${R(perDaySave)} por dia de pista (15% da sua sobra média), você junta um mês de contas em cerca de ${fmt(months,0)} meses. O Faro sugere o valor em cada fechamento.`,
      prefs:prefDefs.map(([k,label,sub,icon],i,a)=>({label,sub,icon,trk:rp[k]?t.accent:t.line2,knob:rp[k]?'21px':'3px',sep:i===a.length-1?'transparent':t.line,onToggle:()=>this.setState(st=>({rem:{...st.rem,[k]:!st.rem[k]}}))}))};
    // car
    const mkm=Math.max(1,M.km), ckmT=(M.en+M.we+M.car)/mkm;
    const parts=[[enLabel,C.fuelKm,t.accent],['Desgaste',s.wear,t.cW],['Carro fixo',M.car/mkm,t.cF]];
    const cmp=['gasolina','etanol','gnv'].map(k=>({k,...s.fuel[k],ckm:s.fuel[k].price/s.fuel[k].eff})), mxc=Math.max(...cmp.map(c=>c.ckm)), bestC=cmp.slice().sort((a,b)=>a.ckm-b.ckm)[0];
    const monthlyKm=C.planDailyGross/s.revKm*C.planned, cur=cmp.find(c=>c.k===ft)||{ckm:C.fuelKm};
    const car={rows:[{icon:'ph-fill ph-gas-pump',label:s.energy==='flex'?`Flex · mais ${FUEL[s.flexUse].label.toLowerCase()} · ${R(F.price,2)}/${F.unit}`:`${F.label} · ${R(F.price,2)}/${F.unit}`,sub:`rende ${fmt(F.eff,1)} km/${F.unit}`,value:R(C.fuelKm,2)+'/km',onClick:this.noop},{icon:'ph-fill ph-wrench',label:'Desgaste',sub:'pneus, óleo, freios, revisões',value:R(s.wear,2)+'/km'},{icon:'ph-fill ph-car-profile',label:s.vehicle==='alugado'?`Aluguel · ${R(rentB.v)}/semana`:s.vehicle==='financiado'?`Parcela · ${R(finB.v)}/mês`:'Seguro',sub:'dividido pelos km do mês · fica em Contas',value:R(M.car/mkm,2)+'/km'}],tags:[{alugado:'Alugado',financiado:'Financiado',dono:'Próprio'}[s.vehicle],ENERGIES.find(e=>e[0]===s.energy)[1],'84.320 km'],costKm:R(ckmT,2),
      parts:parts.map(([l,v,c])=>({label:l,v:R(v,2),w:(v/ckmT*100)+'%',color:c})),
      compare:cmp.map(c=>({label:c.label,icon:c.icon,price:R(c.price,2)+'/'+c.unit,km:R(c.ckm,2),w:(c.ckm/mxc*100)+'%',color:c.k===bestC.k?t.pos:c.k===ft?t.accent:t.line2})),
      tip:bestC.k===ft?'Você já usa o combustível mais barato por km.':`Com ${bestC.label} você gastaria cerca de ${R((cur.ckm-bestC.ckm)*monthlyKm)} a menos por mês, no seu ritmo de ${fmt(monthlyKm,0)} km. Para quem roda muito, o kit GNV costuma se pagar em poucos meses.`,
      maint:[{icon:'ph-duotone ph-drop',name:'Troca de óleo',sub:'a cada 10.000 km',left:'620 km',w:'94%',bar:t.neg,sc:t.neg,iconBg:t.negSoft,iconColor:t.neg},{icon:'ph-duotone ph-tire',name:'Pneus',sub:'a cada 40.000 km',left:'18.400 km',w:'54%',bar:t.gold,sc:t.ink,iconBg:t.surface2,iconColor:t.accent},{icon:'ph-duotone ph-disc',name:'Pastilhas de freio',sub:'a cada 25.000 km',left:'9.100 km',w:'64%',bar:t.accent,sc:t.ink,iconBg:t.surface2,iconColor:t.accent}]};
    // close
    const cs=s.cl,cf=cs.f,setCl=o=>this.setState(st=>({cl:{...st.cl,...o}}));
    const cg=s.sources.reduce((a,x)=>a+parseMoney(cf[x.k]),0), ckmV=parseInt(cf.km||'0',10)||0;
    const exT=(s.recs[TODAY]&&s.recs[TODAY].exp)||0, prevL=cg-ckmV*C.fuelKm-ckmV*s.wear-exT-C.carShare;
    const tdr=today&&today.closed?today:null, sa=this.sepAmounts(s,C);
    const sepRows=[['Carro',s.vehicle==='alugado'?'aluguel + desgaste do dia':'parcela/seguro + desgaste','ph-fill ph-car-profile',t.accent,sa.carro],['Contas da casa','sua parte diária das contas','ph-fill ph-house-line',t.cW,sa.casa],['Reserva','15% da sobra · seu fôlego','ph-fill ph-lifebuoy',t.pos,sa.reserva],['Livre pra você','pode gastar sem culpa','ph-fill ph-smiley',t.gold,sa.livre]].map(([label,sub,icon,color,v])=>({label,sub,icon,color,value:R(v)}));
    const cl={s0:cs.step===0,s1:cs.step===1,s2:false,s3:cs.step===2,keypad:cs.step<2,
      exit:()=>cs.step===1?setCl({step:0,focus:'uber'}):set({screen:'home'}),exitIcon:cs.step===1?'ph-bold ph-caret-left':'ph-bold ph-x',
      dots:[0,1,2].map(i=>({w:i===cs.step?'22px':'7px',bg:i<=cs.step?t.gold:t.line2})),
      plats:s.sources.map(x=>({name:x.name,logoUrl:LOGO[x.k]?`url("${LOGO[x.k]}")`:'none',imgD:LOGO[x.k]?'block':'none',icoD:LOGO[x.k]?'none':'flex',icon:x.icon||'ph-duotone ph-hand-coins',sub:isRide(x.k)?'':'fora do R$/km',subD:isRide(x.k)?'none':'block',val:cf[x.k]||'',onChange:e=>{const v=e.target.value.replace(/[^\d.,]/g,'').slice(0,9);this.setState(st=>({cl:{...st.cl,f:{...st.cl.f,[x.k]:v}}}))}})),
      add:{title:'Nova fonte de renda',ph:'Ex.: Vendas no carro',name:cs.newName||'',icon:'ph-duotone '+(cs.newIcon||ICON_IN[0]),onName:e=>setCl({newName:e.target.value}),iconOpts:ICON_IN.map(ic=>({icon:'ph-duotone '+ic,border:(cs.newIcon||ICON_IN[0])===ic?t.accent:t.line,bg:(cs.newIcon||ICON_IN[0])===ic?t.accentSoft:'transparent',onClick:()=>setCl({newIcon:ic})})),cancel:()=>setCl({adding:false}),op:(cs.newName||'').trim()?'1':'.4',
        confirm:()=>{const nm=(cs.newName||'').trim();if(!nm)return;const k='u'+Date.now();this.setState(st=>({sources:[...st.sources,{k,name:nm,icon:'ph-duotone '+(st.cl.newIcon||ICON_IN[0])}],cl:{...st.cl,adding:false}}));this.flash(`${nm} virou uma fonte de renda`)}},
      adding:!!cs.adding,canAdd:!cs.adding&&s.sources.length<7,startAdd:()=>setCl({adding:true,newName:'',newIcon:ICON_IN[0]}),
      kmVal:cf.km||'',onKm:e=>{const v=e.target.value.replace(/\D/g,'').slice(0,4);this.setState(st=>({cl:{...st.cl,kmEst:false,f:{...st.cl.f,km:v}}}))},kmNote:cs.kmEst?`Estimado pelo seu ganho médio de ${R(s.revKm,2)}/km nos apps. Sabe o número exato? É só trocar.`:ckmV>0?`Hoje você ganhou ${R(rideSum(Object.fromEntries(s.sources.map(x=>[x.k,parseMoney(cf[x.k])])))/ckmV,2)} por km nos apps.`:'Gorjetas e vendas não entram no cálculo por km.',kmTag:cs.kmEst?'estimado':'',
      estimate:()=>{if(cg>0)this.setState(st=>({cl:{...st.cl,f:{...st.cl.f,km:String(Math.round(cg/s.revKm))}}}))},estLabel:cg>0?`Não sei o km · usar ≈ ${Math.round(cg/s.revKm)} km`:'Não sei o km',
      gross:R(cg,2),km:ckmV+' km',hours:[6,7,8,9,10,11,12].map(n=>({label:n+'h',...sel(cs.h===n),onClick:()=>setCl({h:n,hTouched:true,hEst:false})})),hoursNote:cs.hEst?`estimado pelo seu ritmo de ${R(s.perH,0)}/h nos apps`:'',
      preview:ckmV>0?R(prevL,2):'—',prevColor:ckmV>0?(prevL>=0?t.pos:t.neg):t.muted,prevSub:ckmV>0?`${R(prevL/ckmV,2)}/km · ${R(prevL/cs.h,2)}/h`:'digite os km',
      cta:cs.step===0?'Continuar':'Fechar o dia',op:(cs.step===0?cg>0:ckmV>0)?'1':'.4',
      next:()=>{if(cs.step===0){if(cg>0){const rgC=rideSum(Object.fromEntries(s.sources.map(x=>[x.k,parseMoney(cf[x.k])]))),eKm=Math.round(rgC/s.revKm),eH=Math.max(4,Math.min(12,Math.round(rgC/s.perH)));this.setState(st=>({cl:{...st.cl,step:1,kmEst:!st.cl.f.km,f:{...st.cl.f,km:st.cl.f.km||String(eKm)},h:st.cl.hTouched?st.cl.h:eH,hEst:!st.cl.hTouched}}))}}else this.closeDay()},
      fuelOut:R(sa.en,2),sep:sepRows,sepCta:(cs.sep.carro||cs.sep.casa||cs.sep.reserva)?'Separei':'Pular por hoje',
      net:tdr?R(tdr.lucro,2):'',badge:tdr?(tdr.lucro>=C.targetFor(TODAY)?'Meta do dia batida':`${R(Math.max(0,C.targetFor(TODAY)-tdr.lucro))} abaixo da meta de ${R(C.targetFor(TODAY))}`):'',
      stats:tdr?[{label:'Lucro/km',value:R(tdr.lucro/tdr.km,2)},{label:'Lucro/hora',value:R(tdr.lucro/tdr.h,2)},{label:'Rodou',value:tdr.km+' km'}]:[],
      rows:tdr?[{label:'Bruto',value:R(tdr.g,2),vc:t.ink},{label:`${enLabel} + desgaste`,value:'− '+R(tdr.en+tdr.we,2),vc:t.ink},{label:'Carro fixo + gastos na rua',value:'− '+R(tdr.car+tdr.ex,2),vc:t.ink},{label:'Contas da vida',value:'− '+R(tdr.life,2),vc:t.ink},{label:'Sobra do dia',value:R(tdr.sobra,2),vc:t.pos}]:[],
      rewards:[{icon:'ph-fill ph-star-four',v:'+40 XP',l:'dia fechado'},{icon:'ph-fill ph-fire',v:streak+' dias',l:'sequência'},{icon:'ph-fill ph-gauge',v:String(score),l:'Índice Faro'}],
      toMonth:()=>set({screen:'home',period:'mes'}),done:()=>set({screen:'home',period:'dia'})};
    // sheet & keypad
    const ss=s.sh, dStr=(ss.digits||'').replace(/\D/g,''), amt=parseInt(dStr||'0',10)/100, amtF=fmt(amt), ai='', ac='', centsOp='1', centsPh='';
    let amtDim=amtF, amtLit='';{let n=dStr.length,i=amtF.length;while(i>0&&n>0){i--;if(/\d/.test(amtF[i]))n--}if(dStr.length){amtDim=amtF.slice(0,i);amtLit=amtF.slice(i)}} const setSh=o=>this.setState(st=>({sh:{...st.sh,...o}}));
    const press=k=>{if(ss.open){this.setState(st=>{let d=(st.sh.digits||'').replace(/\D/g,'');d=k==='del'?d.slice(0,-1):(d+k).replace(/^0+/,'').slice(0,7);return{sh:{...st.sh,digits:d}}});return}
      const fk=cs.focus,c0=cf[fk]||'',max=fk==='km'?4:7,nv=k==='del'?c0.slice(0,-1):(c0+k).replace(/^0+/,'').slice(0,max);setCl({f:{...cf,[fk]:nv}})};
    const keys=['1','2','3','4','5','6','7','8','9','00','0','del'].map(k=>({label:k==='del'?'':k,icon:k==='del'?'ph-bold ph-backspace':'',onClick:()=>press(k)}));
    const tile=(label,on,onClick,icon,logo,dashed)=>({label,logoUrl:logo?`url("${logo}")`:'none',imgD:logo?'block':'none',icoD:logo?'none':'block',icon:icon||'',ic:on?t.accent:(dashed?t.muted:t.ink),bg:on?t.accentSoft:'transparent',border:on?t.accent:t.line2,bs:dashed?'dashed':'solid',color:on?t.accent:(dashed?t.muted:t.ink),onClick});
    let chips=[],title='',hint='',tabs=[],saveLabel='';
    const adding=!!ss.adding, iconSet=ss.type==='in'?ICON_IN:ICON_OUT, curIc=ss.newIcon||iconSet[0];
    if(ss.type==='in'||ss.type==='out'){title=ss.editId?'Editar gasto':ss.type==='in'?'Lançar ganho':'Lançar gasto';
      tabs=[['in','Ganho','ph-bold ph-arrow-down-left'],['out','Gasto','ph-bold ph-arrow-up-right']].map(([k,l,ic])=>({label:l,icon:ic,bg:ss.type===k?t.surface:'transparent',color:ss.type===k?t.ink:t.muted,onClick:()=>setSh({type:k,adding:false})}));
      const newTile=tile('Nova',false,()=>setSh({adding:true,newName:'',newIcon:iconSet[0]}),'ph-bold ph-plus',null,true);
      if(ss.type==='in'){chips=s.sources.map(x=>tile(x.name,ss.plat===x.k,()=>setSh({plat:x.k}),x.icon||'ph-duotone ph-hand-coins',LOGO[x.k]));if(s.sources.length<7)chips.push(newTile)}
      else{chips=s.expCats.map(c=>tile(c.name,ss.cat===c.name,()=>setSh({cat:c.name}),c.icon));if(s.expCats.length<7)chips.push(newTile)}
      const src=s.sources.find(x=>x.k===ss.plat);
      hint=ss.type==='in'?`Soma no bruto de hoje${src?' em '+src.name:''}. No fechamento é só conferir.`:ss.cat==='Combustível'?'O Faro já desconta o combustível pelos km. Lançar o abastecimento só mede seu consumo real, sem cobrar duas vezes.':'Sai do lucro de hoje como gasto na rua.';
      saveLabel=ss.editId?'Salvar alteração':ss.type==='in'?'Salvar ganho':'Salvar gasto'}
    else if(ss.type==='bill'){title='Nova conta';saveLabel='Criar conta'}
    const add={title:ss.type==='in'?'Nova fonte de renda':'Nova categoria de gasto',ph:ss.type==='in'?'Ex.: Vendas no carro':'Ex.: Celular, multa…',name:ss.newName||'',icon:'ph-duotone '+curIc,onName:e=>setSh({newName:e.target.value}),
      iconOpts:iconSet.map(ic=>({icon:'ph-duotone '+ic,border:curIc===ic?t.accent:t.line,bg:curIc===ic?t.accentSoft:'transparent',onClick:()=>setSh({newIcon:ic})})),cancel:()=>setSh({adding:false}),op:(ss.newName||'').trim()?'1':'.4',
      confirm:()=>{const nm=(ss.newName||'').trim();if(!nm)return;const ic='ph-duotone '+curIc;if(ss.type==='in'){const k='u'+Date.now();this.setState(st=>({sources:[...st.sources,{k,name:nm,icon:ic}],sh:{...st.sh,adding:false,plat:k}}))}else this.setState(st=>({expCats:[...st.expCats,{name:nm,icon:ic}],sh:{...st.sh,adding:false,cat:nm}}));this.flash(`${nm} adicionada`)}};
    const billOpts=pend.slice(0,5).map(o=>({name:o.name,value:R(o.v,o.v%1?2:0),icon:'ph-fill '+o.icon,color:o.color,onClick:()=>{this.setState(st=>({paid:{...st.paid,[o.oid]:1},sh:{...st.sh,open:false},xp:st.xp+10}));this.flash(`${o.name} paga · fora da lista`)}}));
    const nbS=s.nb, setNb=o=>this.setState(st=>({nb:{...st.nb,...o}}));
    const nb={name:nbS.name,icon:'ph-fill '+nbS.icon,color:nbS.color,amount:R(amt,2),amtColor:amt>0?t.ink:t.muted,onName:e=>setNb({name:e.target.value}),
      presets:PRESETS.map(([n,ic,c,cat])=>({name:n,icon:'ph-fill '+ic,onClick:()=>setNb({name:n,icon:ic,color:c,cat})})),
      icons:ICONS.map(ic=>({icon:'ph-fill '+ic,border:nbS.icon===ic?t.accent:t.line,bg:nbS.icon===ic?t.accentSoft:'transparent',onClick:()=>setNb({icon:ic})})),
      colors:COLORS.map(c=>({c,border:nbS.color===c?`3px solid ${t.ink}`:'3px solid transparent',onClick:()=>setNb({color:c})})),
      cats:CATS.map(([k,l])=>({label:l,bg:nbS.cat===k?t.surface:'transparent',color:nbS.cat===k?t.ink:t.muted,onClick:()=>setNb({cat:k})})),
      due:nbS.due,dMinus:()=>setNb({due:Math.max(1,nbS.due-1)}),dPlus:()=>setNb({due:Math.min(31,nbS.due+1)})};
    const save=()=>{if(amt<=0)return;
      if(ss.type==='bill'){if(!nbS.name.trim())return;const id='u'+Date.now();this.setState(st=>({bills:[...st.bills,{id,name:nbS.name.trim(),icon:nbS.icon,color:nbS.color,cat:nbS.cat,v:amt,rec:'mensal',due:nbS.due,on:true,user:true}],sh:{...st.sh,open:false},screen:'bills'}));this.flash(nbS.due<TODAY?`${nbS.name} criada · 1º vencimento em ${nbS.due}/nov`:`${nbS.name} criada · meta recalculada`);return}
      const ec=s.expCats.find(c=>c.name===ss.cat),eic=ec?ec.icon:'ph-duotone ph-receipt';
      this.setState(st=>{const r={...st.recs[TODAY]};let te=st.todayExps||[];if(ss.type==='in'){r.p={...r.p,[ss.plat]:(r.p[ss.plat]||0)+amt}}else{const old=ss.editId?te.find(x=>x.id===ss.editId):null;const oldV=old&&old.cat!=='Combustível'?old.v:0;r.exp=Math.max(0,(r.exp||0)-oldV+(ss.cat!=='Combustível'?amt:0));te=old?te.map(x=>x.id===ss.editId?{...x,v:amt,cat:ss.cat,icon:eic}:x):[...te,{id:'e'+Date.now(),cat:ss.cat,icon:eic,v:amt,time:'agora'}]}return{recs:{...st.recs,[TODAY]:r},todayExps:te,sh:{...st.sh,open:false,editId:null},screen:'home',period:'dia'}});this.flash(ss.editId?'Gasto atualizado':`${ss.type==='in'?'Ganho':'Gasto'} de ${R(amt,2)} lançado`)};
        const setBlocks=[];const B={seg:(label,opts)=>setBlocks.push({isSeg:true,label,opts}),step:(label,sub,value,minus,plus)=>setBlocks.push({isStep:true,label,sub,value,minus,plus}),chips:(label,opts)=>setBlocks.push({isChips:true,label,opts}),note:text=>setBlocks.push({isNote:true,text})};
    const segOpt=(label,on,onClick)=>({label,bg:on?t.surface:'transparent',color:on?t.ink:t.muted,onClick});
    const fs=(k,field,dv)=>()=>this.setState(st=>({fuel:{...st.fuel,[k]:{...st.fuel[k],[field]:Math.max(field==='price'?.1:1,+(st.fuel[k][field]+dv).toFixed(2))}}}));
    if(ss.type==='plan'){title='Editar plano';
      B.step('Guardar por mês','reserva, sonho, imprevisto',R(s.save),()=>set({save:Math.max(0,s.save-100)}),()=>set({save:s.save+100}));
      B.step('Pra gastar com você','lazer, família, o que é seu',R(s.spend),()=>set({spend:Math.max(0,s.spend-100)}),()=>set({spend:s.spend+100}));
      B.seg('Dias de pista por semana',[4,5,6,7].map(n=>segOpt(n+' dias',s.daysWeek===n,()=>set({daysWeek:n}))));
      B.seg('Ganho médio por km nos apps',[['auto','Automático'],['manual','Eu defino']].map(([k,l])=>segOpt(l,(s.revKmMode||'auto')===k,()=>set({revKmMode:k,revKmManual:+s.revLearned.toFixed(2)}))));
      if(s.revKmMode==='manual')B.step('Ganho por km','use o que os apps te pagam em média',R(s.revKmManual,2)+'/km',()=>set({revKmManual:Math.max(1,+(s.revKmManual-.05).toFixed(2))}),()=>set({revKmManual:+(s.revKmManual+.05).toFixed(2)}));
      else B.note(`Automático: ${R(s.revLearned,2)}/km, aprendido dos seus ${s.learnDays} dias fechados. Ele se ajusta sozinho a cada fechamento.`);
      B.note(`As contas da casa (${R(C.life)}) vêm da aba Contas. Mudou uma conta lá, o plano muda aqui.`)}
    if(ss.type==='car'){title='Ajustar carro';
      B.seg('O carro é',[['dono','Próprio'],['financiado','Financiado'],['alugado','Alugado']].map(([k,l])=>segOpt(l,s.vehicle===k,()=>set({vehicle:k}))));
      if(s.vehicle==='alugado')B.step('Aluguel por semana','vence toda segunda · aparece em Contas',R(rentB.v),setBill('aluguel-carro',-25),setBill('aluguel-carro',25));
      if(s.vehicle==='financiado')B.step('Parcela por mês','todo dia 15 · aparece em Contas',R(finB.v),setBill('parcela-carro',-50),setBill('parcela-carro',50));
      B.chips('Combustível',ENERGIES.map(([k,l,icon])=>({label:l,icon,...sel(s.energy===k),onClick:()=>set({energy:k})})));
      const fk=s.energy==='flex'?['gasolina','etanol']:[ft];
      fk.forEach(k=>{const Fk=s.fuel[k];B.step(`${Fk.label} · preço por ${Fk.unit}`,'',R(Fk.price,2),fs(k,'price',-.1),fs(k,'price',.1));B.step(`${Fk.label} · rende`,'média real do seu carro',`${fmt(Fk.eff,1)} km/${Fk.unit}`,fs(k,'eff',-.5),fs(k,'eff',.5))});
      if(s.energy==='flex'){B.seg('Abastece mais com',['gasolina','etanol'].map(k=>segOpt(FUEL[k].label,s.flexUse===k,()=>set({flexUse:k}))));B.note(`Etanol está a ${Math.round(etR*100)}% do preço da gasolina. ${etR<=.7?'Abaixo de 70%, ele compensa.':'Acima de 70%, a gasolina compensa.'}`)}
      B.step('Desgaste por km','pneus, óleo, freios e revisões',R(s.wear,2)+'/km',()=>set({wear:Math.max(.02,+(s.wear-.01).toFixed(2))}),()=>set({wear:+(s.wear+.01).toFixed(2)}))}
    const isSet=ss.type==='plan'||ss.type==='car';
    const mGross=C.planDailyGross*C.planned;
    const live=ss.type==='plan'?[{label:'Meta bruta do mês',value:R(mGross),color:'#fff'},{label:'Faturar por dia',value:R(C.dailyGross),color:t.gold},{label:'Lucro líquido',value:R(C.target),color:'#5EE6A8'}]:[{label:'Custo por km',value:R(C.fuelKm+s.wear,2),color:'#fff'},{label:'Faturar por dia',value:R(C.dailyGross),color:t.gold},{label:'Meta bruta do mês',value:R(mGross),color:'#fff'}];
    const te=s.todayExps||[];
    const delExp=id=>{const x=te.find(y=>y.id===id);if(!x)return;this.setState(st=>{const r={...st.recs[TODAY]};if(x.cat!=='Combustível')r.exp=Math.max(0,(r.exp||0)-x.v);return{recs:{...st.recs,[TODAY]:r},todayExps:st.todayExps.filter(y=>y.id!==id),sh:{...st.sh,open:false,editId:null}}});this.flash(`${x.cat} removido`)};
    const strip=ss.type==='out'&&!ss.editId&&!adding?[...te.map(x=>({label:`${x.cat} · ${R(x.v,x.v%1?2:0)}`,icon:x.icon,iconBg:t.surface2,iconColor:t.ink,bg:'transparent',border:t.line2,tag:'editar',tagIcon:'ph-bold ph-pencil-simple',tagBg:t.surface2,tagColor:t.ink,onClick:()=>this.setState(st=>({sh:{...st.sh,digits:String(Math.round(x.v*100)),cat:x.cat,editId:x.id}}))})),...billOpts.map(b=>({label:`${b.name} · ${b.value}`,icon:b.icon,iconBg:b.color,iconColor:'#fff',bg:'transparent',border:t.line2,tag:'paguei',tagIcon:'ph-bold ph-check',tagBg:t.pos,tagColor:t.posInk,onClick:b.onClick}))]:[];
    const sh={open:ss.open,isSet,live,liveTitle:'ATUALIZA ENQUANTO VOCÊ AJUSTA',blocks:setBlocks,isBill:ss.type==='bill',isMoney:ss.type==='in'||ss.type==='out',adding,notAdding:!adding,showPad:!adding&&!isSet,add,bills:billOpts,hasBills:false,strip,hasStrip:strip.length>0,stripLabel:te.length?'Já lançados hoje (toque para editar) e contas a pagar':'Pagou uma conta fixa? Toque e ela sai da lista',editing:!!ss.editId&&ss.type==='out',del:()=>delExp(ss.editId),title,tabs,chips,hint,saveLabel,int:ai,cents:ac,centsOp,centsPh,amtDim,amtLit,amtColor:amt>0?t.ink:t.muted,op:amt>0?'1':'.4',close:()=>setSh({open:false,adding:false}),save};
    const navItem=(k,ic,l)=>({cls:(s.screen===k?'ph-fill ':'ph ')+ic,label:l,color:s.screen===k?t.accent:t.muted,onClick:nav(k)});
    const darkTop=['home','bills','remind','journey','plan','car'].includes(s.screen)||(s.screen==='onb'&&s.onbStep===0);
    return {t,sbColor:darkTop||this.props.theme!=='dia'?'#fff':'#0D1530',
      isOnb:s.screen==='onb',isHome:s.screen==='home',isClose:s.screen==='close',isBills:s.screen==='bills',isPots:false,isRemind:s.screen==='remind',isJourney:s.screen==='journey',isPlan:s.screen==='plan',isCar:s.screen==='car',
      showNav:['home','bills','remind','journey','plan','car'].includes(s.screen)&&!ss.open,
      onb,goalStack,goalTotal,skipOnb:()=>set({screen:'home',onbStep:0}),goOnb:()=>set({screen:'onb',onbStep:0}),goPlan:nav('plan'),goBills:nav('bills'),goJourney:nav('journey'),goRemind:nav('remind'),back:()=>set({screen:s.prev&&s.prev!==s.screen?s.prev:'journey'}),editCar:()=>this.setState(st=>({sh:{...st.sh,open:true,type:'car',adding:false}})),
      periods,h,actions,isDia:P==='dia',notDia:P!=='dia',isSemana:P==='semana',isMes:P==='mes',dg,alert,nextBills,wk,weekBars,mo,wf,metrics,plats,platTotal:R(view.g,2),showPlats:P!=='dia',tip,
      game,idx,records,badges,badgeCount:`${badges.filter(b=>b.got).length} de ${badges.length}`,shortcuts,pl,bl,pots,rm,car,cl,keys,sh,nb,toast:s.toast,
      openNewBill:()=>this.setState(st=>({sh:{...st.sh,open:true,type:'bill',digits:''},nb:{name:'',icon:'ph-lightbulb',color:'#F2B544',cat:'casa',due:28}})),
      fab:()=>C.todayClosed?set({screen:'close',cl:{...s.cl,step:2}}):this.openClose(),
      guide:(()=>{const sn=s.seen||{};const st=[['Feche seu primeiro dia','30 segundos: apps, km e pronto',C.todayClosed,()=>C.todayClosed?null:this.openClose()],['Confira suas contas','marque o que já pagou',!!sn.bills,nav('bills')],['Veja seu plano do mês','quanto faturar por dia',!!sn.plan,nav('plan')],['Conheça sua Jornada','sequência, nível e Índice Faro',!!sn.journey,nav('journey')]];const done=st.filter(x=>x[2]).length;return{show:s.guide&&done<4&&P==='dia',count:`${done} de 4 feitos`,dismiss:()=>set({guide:false}),steps:st.map(([title,sub,ok,fn],i)=>({title,sub,onClick:fn,n:ok?'':String(i+1),icon:ok?'ph-bold ph-check':'',bg:ok?t.pos:t.accent,color:ok?t.posInk:'#fff',op:ok?'.6':'1'}))}})(),
      intro:(()=>{const I={plan:['ph-fill ph-target','Seu plano do mês','A meta nasce das suas contas. Edite quanto quer guardar e gastar; o resto o Faro calcula sozinho.'],bills:['ph-fill ph-receipt','Todas as contas num lugar só','Carro, casa e cartão. O Faro avisa 2 dias antes; quando pagar, toque em "Paguei".'],car:['ph-fill ph-car-profile','Quanto custa cada km','Combustível, desgaste e aluguel viram R$/km. Mudou algo no carro? Toque em Ajustar.'],journey:['ph-fill ph-fire','Sua Jornada','Cada dia fechado conta. Suba de nível e melhore seu Índice Faro com constância e lucro por km.'],remind:['ph-fill ph-bell-ringing','Você não precisa lembrar de nada','Escolha aqui o que o Faro te avisa e quando.']}[s.screen];const seen=(s.introSeen||{})[s.screen];return I&&!seen&&!ss.open?{show:true,icon:I[0],title:I[1],text:I[2],ok:()=>this.setState(st=>({introSeen:{...(st.introSeen||{}),[st.screen]:1}}))}:{show:false}})(),
      scRef:this.scRef,onScroll:()=>this.checkScroll(),scrollHint:(s.more&&['home','bills','remind','journey','plan','car'].includes(s.screen)&&!ss.open&&!((s.introSeen||{})[s.screen]===undefined&&['plan','bills','car','journey','remind'].includes(s.screen)))?React.createElement('button',{onClick:()=>this.scRef.current&&this.scRef.current.scrollBy({top:380,behavior:'smooth'}),style:{position:'absolute',left:'50%',bottom:102,zIndex:21,height:30,padding:'0 12px',borderRadius:15,border:`1px solid ${t.line2}`,background:t.nav,color:t.muted,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',gap:5,cursor:'pointer',animation:'fbob 1.8s ease-in-out infinite',backdropFilter:'blur(12px)',fontFamily:'inherit',boxShadow:'0 8px 20px -10px rgba(0,0,0,.4)'}},React.createElement('i',{className:'ph-bold ph-caret-down'}),'role para ver mais'):null,
      lifeCard,navL:[navItem('home','ph-house','Início'),navItem('plan','ph-target','Plano')],navR:[navItem('bills','ph-receipt','Contas'),navItem('car','ph-car-profile','Carro')]};
  }
  openClose(){const r=this.state.recs[TODAY];const f={km:''};this.state.sources.forEach(x=>{const v=r.p[x.k];f[x.k]=v?v.toFixed(2).replace('.',','):''});this.setState(st=>({screen:'close',cl:{...st.cl,step:0,adding:false,f,h:9}}))}
}
</script>
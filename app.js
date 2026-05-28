const Mem={usuarios:null,turnos:null,checklists:null,execucoes:null,last:{usuarios:0,turnos:0,checklists:0,execucoes:0},pending:{}};
function desativarSugestoesCampos(root=document){
  const filhos=root.querySelectorAll?[...root.querySelectorAll("input, textarea")]:[];
  const campos=root.matches&&root.matches("input, textarea")?[root,...filhos]:filhos;
  campos.forEach(campo=>{
    campo.setAttribute("autocomplete",campo.type==="password"?"new-password":"off");
    campo.setAttribute("autocorrect","off");
    campo.setAttribute("autocapitalize","off");
    campo.setAttribute("spellcheck","false");
  });
}
document.addEventListener("DOMContentLoaded",()=>desativarSugestoesCampos());
document.addEventListener("focusin",e=>{if(e.target?.matches?.("input, textarea"))desativarSugestoesCampos(e.target)});
function normalizarLogin(v){const s=String(v||"").trim();return /^\d+$/.test(s)?s.padStart(2,"0"):s}
function normalizarUsuario(u){
  const login=normalizarLogin(u.login);
  let nome=String(u.nome||u.nomeUsuario||u.usuario||"").trim();
  if(!nome && login===APP.ADMIN_MESTRE) nome="Andre";
  if(!nome) nome="Usuário";
  return {...u,login,nome,tipo:String(u.tipo||"operador").trim().toLowerCase(),turnosPermitidos:String(u.turnosPermitidos||"").trim()};
}
function usuarioLogado(){try{const u=JSON.parse(localStorage.getItem("usuarioLogado"));return u?normalizarUsuario(u):null}catch(e){return null}}
function exigirLogin(){const u=usuarioLogado();if(!u){location.href="login.html";return null}return u}
function nomePorLogin(login){
  login=normalizarLogin(login);
  try{
    const lista=JSON.parse(localStorage.getItem("usuariosSistema")||"[]");
    const u=lista.find(x=>normalizarLogin(x.login)===login);
    if(u && u.nome) return u.nome;
  }catch(e){}
  if(login===APP.ADMIN_MESTRE) return "Andre";
  return login ? "Usuário " + login : "";
}
function nomeExecucao(ex){
  if(!ex) return "";
  return ex.nomeUsuario || ex.nome || nomePorLogin(ex.login);
}
function hojeISO(){return new Date().toISOString().split("T")[0]}
function dataBR(d=new Date()){return d.toLocaleDateString("pt-BR")}
function horaBR(d=new Date()){return d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
function horaArquivo(d=new Date()){return horaBR(d).replace(":","-")}
function horarioParaMinutos(h){const s=String(h||"00:00").slice(0,5);const p=s.split(":");return parseInt(p[0]||"0")*60+parseInt(p[1]||"0")}
function agoraMinutos(){const a=new Date();return a.getHours()*60+a.getMinutes()}
function reaberturaExpirada(ex){
  if(!ex)return false;
  if(ex.reabertoEm){
    const base=new Date(ex.reabertoEm);
    if(!isNaN(base.getTime()))return Date.now()>base.getTime()+60*60*1000;
  }
  const lim=horarioParaMinutos(ex.novoHorarioFim||"");
  const now=agoraMinutos();
  return lim?now>lim:false;
}
function diaSemanaAtual(){return ["dom","seg","ter","qua","qui","sex","sab"][new Date().getDay()]}
function parseLista(v){if(Array.isArray(v))return v.map(x=>String(x).trim()).filter(Boolean);return String(v||"").split(",").map(x=>x.trim()).filter(Boolean)}
function parseTarefas(v){if(Array.isArray(v))return v.flatMap(x=>String(x).replace(/\\n/g,"\n").split(/\n|;/)).map(x=>x.trim()).filter(Boolean);return String(v||"").replace(/\\n/g,"\n").split(/\n|;/).map(x=>x.trim()).filter(Boolean)}
function normalizarHora(v){
  const s=String(v||"").trim();
  if(/^\d{1,2}$/.test(s)){
    const h=Math.min(23,Math.max(0,parseInt(s,10)));
    return String(h).padStart(2,"0")+":00";
  }
  const m=s.match(/(\d{1,2}):?(\d{2})?/);
  if(m){
    const h=Math.min(23,Math.max(0,parseInt(m[1]||"0",10)));
    const min=Math.min(59,Math.max(0,parseInt(m[2]||"0",10)));
    return String(h).padStart(2,"0")+":"+String(min).padStart(2,"0");
  }
  return "00:00";
}
function normalizarChecklist(c){return{id:String(c.id||"").trim(),nome:String(c.nome||"").trim(),descricao:String(c.descricao||"").trim(),horario:normalizarHora(c.horario),horarioFim:normalizarHora(c.horarioFim||"23:59"),turnos:parseLista(c.turnos),dias:parseLista(String(c.dias||"").toLowerCase()),prioridade:String(c.prioridade||"media").toLowerCase(),responsaveisPermitidos:parseLista(c.responsaveisPermitidos||""),tarefas:parseTarefas(c.tarefas),ativo:String(c.ativo||"sim").toLowerCase()}}
function normalizarTurno(t){return{id:String(t.id||"").trim(),nome:String(t.nome||"").trim(),ativo:String(t.ativo||"sim").toLowerCase()}}
function execId(c,data=hojeISO()){return `${data}_${c.id}_${String(c.horario).replace(":","-")}`}
function getExecLocal(id){try{return JSON.parse(localStorage.getItem("exec_"+id)||"null")}catch(e){return null}}
function setExecLocal(id,d){localStorage.setItem("exec_"+id,JSON.stringify(d))}
function removeExecLocal(id){localStorage.removeItem("exec_"+id)}
function postAPI(data){return fetch(APP.API_URL,{method:"POST",mode:"no-cors",body:new URLSearchParams(data)})}
function jsonp(acao,params={}){return new Promise((resolve,reject)=>{const cb="cb_"+Date.now()+"_"+Math.floor(Math.random()*99999);const qs=new URLSearchParams({...params,acao,callback:cb});const s=document.createElement("script");window[cb]=d=>{resolve(d);delete window[cb];s.remove()};s.onerror=()=>{delete window[cb];s.remove();reject(new Error("Falha ao conectar ao servidor"))};s.src=APP.API_URL+"?"+qs.toString();document.body.appendChild(s)})}
function cacheOk(tipo){return Date.now()-(Mem.last[tipo]||0)<APP.CACHE_MS}
function pendente(chave,fn){if(Mem.pending[chave])return Mem.pending[chave];Mem.pending[chave]=fn().finally(()=>delete Mem.pending[chave]);return Mem.pending[chave]}
async function carregarUsuariosOnline(force=false){if(!force&&Mem.usuarios&&cacheOk("usuarios"))return Mem.usuarios;return pendente("usuarios",async()=>{const d=await jsonp("getUsers");if(d?.status==="ok"){Mem.usuarios=(d.usuarios||[]).map(normalizarUsuario);localStorage.setItem("usuariosSistema",JSON.stringify(Mem.usuarios));Mem.last.usuarios=Date.now();return Mem.usuarios}throw new Error("Erro ao carregar usuários")})}
async function salvarUsuarioOnline(u,ator){await postAPI({...u,acao:"saveUser",atorLogin:ator||""});Mem.usuarios=null;Mem.last.usuarios=0}
async function carregarTurnosOnline(force=false){if(!force&&Mem.turnos&&cacheOk("turnos"))return Mem.turnos;return pendente("turnos",async()=>{const d=await jsonp("getTurnos");if(d?.status==="ok"){Mem.turnos=(d.turnos||[]).map(normalizarTurno).filter(t=>t.id&&t.ativo!=="nao");localStorage.setItem("turnosSistema",JSON.stringify(Mem.turnos));Mem.last.turnos=Date.now();return Mem.turnos}throw new Error("Erro ao carregar turnos")})}
async function carregarChecklistsOnline(force=false,incluirInativos=false){if(!force&&Mem.checklists&&cacheOk("checklists"))return incluirInativos?Mem.checklists:Mem.checklists.filter(c=>c.ativo!=="nao");const lista=await pendente("checklists",async()=>{const d=await jsonp("getChecklists");if(d?.status==="ok"){Mem.checklists=(d.checklists||[]).map(normalizarChecklist).filter(c=>c.id&&c.nome);localStorage.setItem("checklistsSistema",JSON.stringify(Mem.checklists));Mem.last.checklists=Date.now();return Mem.checklists}throw new Error("Erro ao carregar checklists")});return incluirInativos?lista:lista.filter(c=>c.ativo!=="nao")}
async function carregarExecucoesOnline(inicio="",fim="",force=false){const chave=`execucoes_${inicio}_${fim}`;if(!force&&Mem.execucoes&&cacheOk("execucoes"))return Mem.execucoes;return pendente(chave,async()=>{const d=await jsonp("getExecucoes",{inicio,fim});if(d?.status==="ok"){Mem.execucoes=d.execucoes||[];Mem.last.execucoes=Date.now();return Mem.execucoes}return[]})}
async function obterTurnos(){try{return await carregarTurnosOnline()}catch(e){const c=localStorage.getItem("turnosSistema");return c?JSON.parse(c):APP.DEFAULT_TURNOS}}
async function obterChecklists(incluirInativos=false){try{return await carregarChecklistsOnline(false,incluirInativos)}catch(e){const c=localStorage.getItem("checklistsSistema");let a=c?JSON.parse(c):[];return incluirInativos?a:a.filter(x=>x.ativo!=="nao")}}
function usuarioPodeVerTurno(u,t){if(u.tipo==="admin")return true;if(t==="gerencial")return false;const p=parseLista(u.turnosPermitidos||"");return !p.length||p.includes(t)}
function checklistPermitidoUsuario(c,u,t){if(u.tipo==="admin")return true;if(!c.turnos.includes(t))return false;const p=c.responsaveisPermitidos||[];return !p.length||p.includes(u.login)}
function statusExecucao(c,ex=null){const now=agoraMinutos(),ini=horarioParaMinutos(c.horario),fim=horarioParaMinutos(c.horarioFim);if(ex){if(["finalizado","aguardando_envio"].includes(ex.status))return ex.status;if(ex.status==="executando")return(ex.novoHorarioFim||ex.reabertoEm)&&reaberturaExpirada(ex)?"expirado":"executando";if(ex.status==="reaberto")return reaberturaExpirada(ex)?"expirado":"reaberto";if(ex.status==="expirado")return"expirado"}if(now<ini)return"aguardando";if(now>fim)return"expirado";if(now-ini>=60)return"critico";if(now-ini>=30)return"atrasado";return"liberado"}
function classeStatus(st){return{finalizado:"green",aguardando_envio:"blue",executando:"green",reaberto:"green",aguardando:"gray",liberado:"green",atrasado:"red",critico:"darkred",expirado:"gray"}[st]||"gray"}
function textoStatus(st,c,ex){const nome=nomeExecucao(ex);if(st==="finalizado")return`✅ Finalizado${nome?" por "+nome:""}`;if(st==="aguardando_envio")return`🟡 Aguardando envio${nome?" ("+nome+")":""}`;if(st==="executando")return`🟢 Em execução${nome?" por "+nome:""}`;if(st==="reaberto")return`🟢 Reaberto até ${ex?.novoHorarioFim||c.horarioFim}`;if(st==="aguardando")return"⏳ Aguardando horário";if(st==="liberado")return"🟢 Liberado";if(st==="atrasado")return"🔴 Atrasado";if(st==="critico")return"⚫ Crítico";if(st==="expirado")return"❌ Não feito / expirado";return"Pendente"}
function ordenarCards(a,b){const fa=["finalizado","expirado","aguardando_envio"].includes(a.status)?1:0,fb=["finalizado","expirado","aguardando_envio"].includes(b.status)?1:0;if(fa!==fb)return fa-fb;return horarioParaMinutos(a.checklist.horario)-horarioParaMinutos(b.checklist.horario)}
function tocarAlarme(c=1){for(let i=0;i<c;i++)setTimeout(()=>{try{navigator.vibrate?.(2000)}catch(e){}try{const a=new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");a.play();setTimeout(()=>{try{a.pause();a.currentTime=0}catch(e){}},2000)}catch(e){}},i*2600)}
function alertaUnico(id,tipo,ciclos,msg=null){const k=`${id}_${tipo}_alerta_v6`;if(localStorage.getItem(k))return;localStorage.setItem(k,"1");tocarAlarme(ciclos);if(msg)postAPI({acao:"telegram",mensagem:msg})}
function nomePdf(c){const a=new Date(),ano=a.getFullYear(),mes=String(a.getMonth()+1).padStart(2,"0"),dia=String(a.getDate()).padStart(2,"0");return`${ano}-${mes}-${dia} - ${c.nome.toLowerCase()} - ${horaArquivo(a)}.pdf`}
function marcarSync(t=""){localStorage.setItem("ultimaSync",t||new Date().toISOString())}
function textoUltimaSync(){const s=localStorage.getItem("ultimaSync");if(!s)return"Ainda não sincronizado";const m=Math.floor((Date.now()-new Date(s).getTime())/60000);return m<=0?"Atualizado agora":`Atualizado há ${m} min`}
function confirmarAcao({titulo="Confirmar ação",texto="",confirmar="Confirmar",cancelar="Cancelar",perigo=false}={}){return new Promise(resolve=>{let modal=document.getElementById("confirmModal");if(!modal){modal=document.createElement("div");modal.id="confirmModal";modal.className="modal";modal.innerHTML=`<div class="modalContent confirmModal"><h2 id="confirmTitulo"></h2><p id="confirmTexto"></p><div class="confirmActions"><button id="confirmCancelar" class="secondary" type="button"></button><button id="confirmOk" type="button"></button></div></div>`;document.body.appendChild(modal)}const ok=document.getElementById("confirmOk"),cancel=document.getElementById("confirmCancelar");document.getElementById("confirmTitulo").innerText=titulo;document.getElementById("confirmTexto").innerText=texto;ok.innerText=confirmar;ok.className=perigo?"red":"";cancel.innerText=cancelar;modal.style.display="flex";const fechar=v=>{modal.style.display="none";ok.onclick=null;cancel.onclick=null;resolve(v)};ok.onclick=()=>fechar(true);cancel.onclick=()=>fechar(false)})}
async function enfileirarEnvio(payload){const f=JSON.parse(localStorage.getItem("filaEnvio")||"[]");f.push({...payload,criadoEm:new Date().toISOString()});localStorage.setItem("filaEnvio",JSON.stringify(f))}
async function processarFila(){if(!navigator.onLine)return;const f=JSON.parse(localStorage.getItem("filaEnvio")||"[]");if(!f.length)return;const r=[];for(const item of f){try{await postAPI(item)}catch(e){r.push(item)}}localStorage.setItem("filaEnvio",JSON.stringify(r))}
window.addEventListener("online",processarFila);setInterval(processarFila,60000);

// Painel Operacional Confiança v6.9
const PASTA_DRIVE_ID = "1_00PqHAvoQBvkfhtilBrZNsB6AJV9MtG";
const PLANILHA_ID = "1OViTBjCmDPs56dp2_g6vbIszFau3WNI1LahAbR29X94";
const TELEGRAM_TOKEN = "8414044142:AAHoof4NoOkqiM1FfeY9EmMekfodnqh0LN8";
const TELEGRAM_CHAT_ID = "5426828201";
const ADMIN_MESTRE = "01";
const ABAS={usuarios:["login","senha","nome","tipo","turnosPermitidos","empresasPermitidas"],turnos:["id","nome","empresaId","ativo"],empresas:["id","nome","turnos","ativo"],checklists:["id","nome","descricao","horario","horarioFim","turnos","dias","prioridade","responsaveisPermitidos","tarefas","ativo","empresaId"],execucoes:["idExecucao","data","idChecklist","nomeChecklist","horario","horarioFim","status","login","nomeUsuario","turno","urlPDF","criadoEm","nomeArquivo","reabertoPor","reabertoEm","novoHorarioFim"],logs:["dataHora","tipo","login","nomeUsuario","idChecklist","nomeChecklist","detalhe"]};
function doGet(e){try{setup_();const acao=e.parameter.acao||"status",cb=e.parameter.callback;let r={status:"ok",mensagem:"Servidor online v6.9"};if(acao==="getSyncInfo")r=syncInfo_();if(acao==="getUsers")r={status:"ok",usuarios:listar_("usuarios")};if(acao==="getTurnos")r={status:"ok",turnos:listar_("turnos")};if(acao==="getEmpresas")r={status:"ok",empresas:listar_("empresas")};if(acao==="getChecklists")r={status:"ok",checklists:listar_("checklists")};if(acao==="getExecucoes")r={status:"ok",execucoes:listarExecucoes_(e.parameter.inicio,e.parameter.fim)};if(acao==="reabrirExecucao")r=reabrirExecucaoDados_(e);if(acao==="verificarVencidos")r=verificarChecklistsVencidos_(e.parameter.empresaId||"");const txt=JSON.stringify(r);if(cb)return ContentService.createTextOutput(cb+"("+txt+")").setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON)}catch(err){return ContentService.createTextOutput(JSON.stringify({status:"erro",mensagem:err.toString()})).setMimeType(ContentService.MimeType.JSON)}}
function doPost(e){try{setup_();const a=e.parameter.acao||"";if(a==="telegram")return enviarTelegram_(e.parameter.mensagem||"");if(a==="saveUser")return salvarUsuario_(e);if(a==="saveChecklist")return salvarChecklist_(e);if(a==="saveTurno")return salvarTurno_(e);if(a==="saveEmpresa")return salvarEmpresa_(e);if(a==="deleteEmpresa")return deleteEmpresa_(e);if(a==="deleteTurno")return deleteTurno_(e);if(a==="toggleChecklist")return toggleChecklist_(e);if(a==="deleteChecklist")return deleteChecklist_(e);if(a==="iniciarExecucao")return iniciarExecucao_(e);if(a==="finalizarExecucao")return finalizarExecucao_(e);if(a==="reabrirExecucao")return reabrirExecucao_(e);if(a==="log")return log_(e.parameter.tipo,e.parameter.login,e.parameter.nomeUsuario,e.parameter.idChecklist,e.parameter.nomeChecklist,e.parameter.detalhe);return ContentService.createTextOutput("Ação desconhecida: "+a)}catch(err){return ContentService.createTextOutput("ERRO: "+err.toString())}}
function ss_(){return SpreadsheetApp.openById(PLANILHA_ID)}
function aba_(nome){const ss=ss_();let sh=ss.getSheetByName(nome);const headers=ABAS[nome];if(!sh){sh=ss.insertSheet(nome);sh.getRange(1,1,1,headers.length).setValues([headers])}const atual=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getValues()[0].map(String);headers.forEach(h=>{if(atual.indexOf(h)===-1)sh.getRange(1,sh.getLastColumn()+1).setValue(h)});return sh}

function normalizarLogin_(login){
  login = String(login || "").trim();
  if (/^\d+$/.test(login)) return login.padStart(2, "0");
  return login;
}

function normalizarAbaUsuarios_(){
  const sh = aba_("usuarios");
  const values = sh.getDataRange().getValues();
  if (!values.length) return;

  const headers = values[0].map(String);
  const canonical = ABAS.usuarios;

  const hasDuplicateNome = headers.filter(h => h === "nome").length > 1;
  const headerErrado =
    headers.length !== canonical.length ||
    canonical.some((h, i) => headers[i] !== h) ||
    hasDuplicateNome;

  if (!headerErrado) return;

  const idx = {};
  headers.forEach((h, i) => {
    if (!idx[h]) idx[h] = [];
    idx[h].push(i);
  });

  const novos = [canonical];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const loginRaw = row[idx.login ? idx.login[0] : 0];
    if (String(loginRaw || "").trim() === "") continue;

    const login = normalizarLogin_(loginRaw);
    const senha = String(row[idx.senha ? idx.senha[0] : 1] || "").trim();

    let nome = "";
    if (idx.nome) {
      for (const i of idx.nome) {
        const v = String(row[i] || "").trim();
        if (v) { nome = v; break; }
      }
    }
    if (!nome && login === ADMIN_MESTRE) nome = "Andre";

    const tipo = String(row[idx.tipo ? idx.tipo[0] : 3] || "operador").trim().toLowerCase();

    let turnosPermitidos = "";
    if (idx.turnosPermitidos) {
      turnosPermitidos = String(row[idx.turnosPermitidos[0]] || "").trim();
    }
    let empresasPermitidas = "";
    if (idx.empresasPermitidas) {
      empresasPermitidas = String(row[idx.empresasPermitidas[0]] || "").trim();
    }

    const existente = novos.findIndex(x => x[0] === login);
    const linha = [login, senha, nome, tipo, turnosPermitidos, empresasPermitidas];

    // login é a referência: se existir repetido, mantém a última linha preenchida
    if (existente >= 1) novos[existente] = linha;
    else novos.push(linha);
  }

  sh.clearContents();
  sh.getRange(1, 1, novos.length, canonical.length).setValues(novos);
}

function setup_(){Object.keys(ABAS).forEach(aba_);seed_();normalizarAbaUsuarios_()}
function seed_(){const u=aba_("usuarios");if(u.getLastRow()===1){u.appendRow(["01","7421","Andre","admin","todos","todos"]);u.appendRow(["02","7421","Katia","operador","",""]);u.appendRow(["04","1111","Maria","operador","",""]);u.appendRow(["08","0000","Tauna","operador","",""])}const t=aba_("turnos");if(t.getLastRow()===1){[["gerencial","Gerencial","","sim"]].forEach(r=>t.appendRow(r))}}
function formatCell_(v,campo){
  if(Object.prototype.toString.call(v)==="[object Date]"){
    if(campo==="data") return Utilities.formatDate(v,Session.getScriptTimeZone(),"yyyy-MM-dd");
    if(campo==="criadoEm"||campo==="reabertoEm"||campo==="dataHora") return Utilities.formatDate(v,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss");
    return Utilities.formatDate(v,Session.getScriptTimeZone(),"HH:mm");
  }
  return String(v==null?"":v);
}
function listar_(nome){
  const sh=aba_(nome),vals=sh.getDataRange().getValues(),h=vals[0].map(String),out=[];
  const mapaUsuarios = {};

  for(let i=1;i<vals.length;i++){
    if(vals[i].join("")==="")continue;
    let o={};
    h.forEach((k,j)=>{
      let valor=formatCell_(vals[i][j],k);
      if(nome==="usuarios" && k==="login") valor=normalizarLogin_(valor);
      o[k]=valor;
    });

    if(nome==="usuarios"){
      if(!o.nome && o.login===ADMIN_MESTRE) o.nome="Andre";
      o.tipo=String(o.tipo||"operador").toLowerCase();
      mapaUsuarios[o.login]=o;
    }else{
      out.push(o);
    }
  }

  if(nome==="usuarios") return Object.values(mapaUsuarios);
  return out;
}
function listarExecucoes_(inicio,fim){return listar_("execucoes").filter(r=>(!inicio||r.data>=inicio)&&(!fim||r.data<=fim))}
function syncInfo_(){
  const nomes=["usuarios","turnos","empresas","checklists","execucoes"];
  const partes=nomes.map(nome=>{
    const sh=aba_(nome);
    const vals=sh.getDataRange().getDisplayValues();
    return nome+":"+JSON.stringify(vals);
  }).join("|");
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,partes).map(b=>("0"+((b+256)%256).toString(16)).slice(-2)).join("").slice(0,10);
  return {status:"ok",versao:"v6.9",revision:digest,servidorEm:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss")};
}
function salvarUsuario_(e){
  const login=normalizarLogin_(e.parameter.login);
  const ator=normalizarLogin_(e.parameter.atorLogin);
  if(login===ADMIN_MESTRE && ator!==ADMIN_MESTRE) return ContentService.createTextOutput("Admin mestre protegido");

  upsertObj_("usuarios","login",login,{
    login,
    senha:e.parameter.senha||"",
    nome:e.parameter.nome||"",
    tipo:e.parameter.tipo||"operador",
    turnosPermitidos:e.parameter.turnosPermitidos||"",
    empresasPermitidas:e.parameter.empresasPermitidas||""
  });

  normalizarAbaUsuarios_();
  log_("salvou_usuario",ator,"",login,e.parameter.nome||"","Usuário salvo/atualizado");
  return ContentService.createTextOutput("ok");
}

function normalizarHora_(valor){
  valor = String(valor || "").trim();
  if (/^\d{1,2}$/.test(valor)) {
    let h = Math.min(23, Math.max(0, parseInt(valor, 10)));
    return String(h).padStart(2, "0") + ":00";
  }
  let m = valor.match(/(\d{1,2}):?(\d{2})?/);
  if (m) {
    let h = Math.min(23, Math.max(0, parseInt(m[1] || "0", 10)));
    let min = Math.min(59, Math.max(0, parseInt(m[2] || "0", 10)));
    return String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
  }
  return "00:00";
}


function salvarTurno_(e){
  const id=String(e.parameter.id||"").trim();
  const nome=String(e.parameter.nome||"").trim();
  const empresaId=String(e.parameter.empresaId||"").trim();
  const ativo=String(e.parameter.ativo||"sim").trim()||"sim";
  if(!id||!nome)return ContentService.createTextOutput("Dados incompletos");
  upsertObj_("turnos","id",id,{id,nome,empresaId,ativo});
  log_("salvou_turno",e.parameter.login,e.parameter.nomeUsuario,id,nome,"Turno salvo para empresa "+empresaId);
  return ContentService.createTextOutput("ok");
}
function deleteTurno_(e){
  const id=String(e.parameter.id||"").trim();
  if(id==="gerencial")return ContentService.createTextOutput("Turno Gerencial protegido");
  deleteRow_("turnos","id",id);
  log_("excluiu_turno",e.parameter.login,e.parameter.nomeUsuario,id,"","Turno excluído");
  return ContentService.createTextOutput("ok");
}

function salvarEmpresa_(e){
  const id=String(e.parameter.id||"").trim();
  const nome=String(e.parameter.nome||"").trim();
  const turnos=String(e.parameter.turnos||"").trim();
  const ativo=String(e.parameter.ativo||"sim").trim()||"sim";
  if(!id||!nome)return ContentService.createTextOutput("Dados incompletos");
  upsertObj_("empresas","id",id,{id,nome,turnos,ativo});
  log_("salvou_empresa",e.parameter.login,e.parameter.nomeUsuario,id,nome,"Empresa salva");
  return ContentService.createTextOutput("ok");
}
function deleteEmpresa_(e){
  const id=String(e.parameter.id||"").trim();
  deleteRow_("empresas","id",id);
  log_("excluiu_empresa",e.parameter.login,e.parameter.nomeUsuario,id,"","Empresa excluída");
  return ContentService.createTextOutput("ok");
}

function salvarChecklist_(e){upsertObj_("checklists","id",e.parameter.id,{id:e.parameter.id,nome:e.parameter.nome,descricao:e.parameter.descricao,horario:normalizarHora_(e.parameter.horario),horarioFim:normalizarHora_(e.parameter.horarioFim),turnos:e.parameter.turnos,dias:e.parameter.dias,prioridade:e.parameter.prioridade,responsaveisPermitidos:e.parameter.responsaveisPermitidos||"",tarefas:e.parameter.tarefas,ativo:e.parameter.ativo,empresaId:e.parameter.empresaId||""});log_("salvou_checklist",e.parameter.login,e.parameter.nomeUsuario,e.parameter.id,e.parameter.nome,"Checklist salvo");return ContentService.createTextOutput("ok")}
function upsertObj_(abaNome,keyName,keyValue,obj){
  const sh=aba_(abaNome),vals=sh.getDataRange().getValues(),h=vals[0].map(String),keyCol=h.indexOf(keyName)+1,row=h.map(k=>obj[k]||"");
  const chaveNova = (abaNome==="usuarios" && keyName==="login") ? normalizarLogin_(keyValue) : String(keyValue).trim();

  for(let i=1;i<vals.length;i++){
    let chaveAtual = String(vals[i][keyCol-1]).trim();
    if(abaNome==="usuarios" && keyName==="login") chaveAtual = normalizarLogin_(chaveAtual);

    if(chaveAtual===chaveNova){
      sh.getRange(i+1,1,1,h.length).setValues([row]);
      return;
    }
  }
  sh.appendRow(row);
}
function toggleChecklist_(e){updateField_("checklists","id",e.parameter.id,"ativo",e.parameter.ativo);log_("toggle_checklist",e.parameter.login,e.parameter.nomeUsuario,e.parameter.id,"","Ativo: "+e.parameter.ativo);return ContentService.createTextOutput("ok")}
function deleteChecklist_(e){deleteRow_("checklists","id",e.parameter.id);log_("excluiu_checklist",e.parameter.login,e.parameter.nomeUsuario,e.parameter.id,"","Excluído");return ContentService.createTextOutput("ok")}
function updateField_(abaNome,keyName,keyValue,field,value){const sh=aba_(abaNome),vals=sh.getDataRange().getValues(),h=vals[0].map(String),keyCol=h.indexOf(keyName)+1,fCol=h.indexOf(field)+1;for(let i=1;i<vals.length;i++){if(String(vals[i][keyCol-1]).trim()===String(keyValue).trim()){sh.getRange(i+1,fCol).setValue(value);return}}}

function nomeUsuarioPorLogin_(login){
  login=String(login||"").trim();
  if(/^\d+$/.test(login)) login=login.padStart(2,"0");
  const usuarios=listar_("usuarios");
  const u=usuarios.find(x=>String(x.login)===login);
  if(u&&u.nome)return u.nome;
  if(login===ADMIN_MESTRE)return "Andre";
  return login?("Usuário "+login):"";
}

function deleteRow_(abaNome,keyName,keyValue){const sh=aba_(abaNome),vals=sh.getDataRange().getValues(),h=vals[0].map(String),keyCol=h.indexOf(keyName)+1;for(let i=1;i<vals.length;i++){if(String(vals[i][keyCol-1]).trim()===String(keyValue).trim()){sh.deleteRow(i+1);return}}}
function iniciarExecucao_(e){
  const idExec=String(e.parameter.idExecucao||"").trim();
  const idChecklist=String(e.parameter.idChecklist||"").trim();
  if(!idExec||!idChecklist)return ContentService.createTextOutput("Dados incompletos");
  const existente=listar_("execucoes").find(function(r){return String(r.idExecucao).trim()===idExec})||{};
  const statusAtual=String(existente.status||"").toLowerCase();
  if(statusAtual==="finalizado"||statusAtual==="aguardando_envio")return ContentService.createTextOutput("Execução já finalizada");
  upsertObj_("execucoes","idExecucao",idExec,{
    idExecucao:idExec,
    data:e.parameter.data||dataHoje_(),
    idChecklist:idChecklist,
    nomeChecklist:e.parameter.nomeChecklist||"",
    horario:normalizarHora_(e.parameter.horario),
    horarioFim:normalizarHora_(e.parameter.horarioFim),
    status:"executando",
    login:normalizarLogin_(e.parameter.login),
    nomeUsuario:e.parameter.nomeUsuario||nomeUsuarioPorLogin_(e.parameter.login),
    turno:e.parameter.turno||"",
    urlPDF:"",
    criadoEm:existente.criadoEm||new Date().toISOString(),
    nomeArquivo:"",
    reabertoPor:existente.reabertoPor||"",
    reabertoEm:existente.reabertoEm||"",
    novoHorarioFim:existente.novoHorarioFim||""
  });
  log_("iniciou_execucao",e.parameter.login,e.parameter.nomeUsuario,idChecklist,e.parameter.nomeChecklist,"Iniciou "+idExec);
  return ContentService.createTextOutput("ok");
}
function finalizarExecucao_(e){const pdf=salvarPdfInterno_(e.parameter.nomeArquivo,e.parameter.base64);upsertObj_("execucoes","idExecucao",e.parameter.idExecucao,{idExecucao:e.parameter.idExecucao,data:e.parameter.data,idChecklist:e.parameter.idChecklist,nomeChecklist:e.parameter.nomeChecklist,horario:normalizarHora_(e.parameter.horario),horarioFim:normalizarHora_(e.parameter.horarioFim),status:e.parameter.status,login:e.parameter.login,nomeUsuario:e.parameter.nomeUsuario||nomeUsuarioPorLogin_(e.parameter.login),turno:e.parameter.turno,urlPDF:pdf.url,criadoEm:new Date().toISOString(),nomeArquivo:e.parameter.nomeArquivo,reabertoPor:"",reabertoEm:"",novoHorarioFim:""});log_("finalizou",e.parameter.login,e.parameter.nomeUsuario,e.parameter.idChecklist,e.parameter.nomeChecklist,"PDF: "+pdf.url);return ContentService.createTextOutput(JSON.stringify({status:"ok",urlPDF:pdf.url})).setMimeType(ContentService.MimeType.JSON)}

function checklistPorId_(id){
  const lista=listar_("checklists");
  return lista.find(c=>String(c.id).trim()===String(id).trim()) || {};
}
function dataHoje_(){
  return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd");
}
function dataBR_(){
  return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"dd/MM/yyyy");
}
function diaSemana_(){
  return ["dom","seg","ter","qua","qui","sex","sab"][new Date().getDay()];
}
function parseLista_(v){
  return String(v||"").split(",").map(function(x){return x.trim()}).filter(Boolean);
}
function minutos_(h){
  const p=String(h||"00:00").slice(0,5).split(":");
  return (parseInt(p[0]||"0",10)*60)+(parseInt(p[1]||"0",10));
}
function agoraMinutos_(){
  const now=new Date();
  return now.getHours()*60+now.getMinutes();
}
function execId_(c,data){
  return data+"_"+c.id+"_"+String(c.horario).replace(":","-");
}
function nomeEmpresa_(id){
  const e=listar_("empresas").find(function(x){return String(x.id).trim()===String(id||"").trim()});
  return e&&e.nome?e.nome:(id||"Sem empresa");
}
function execFinalizada_(ex){
  if(!ex)return false;
  const st=String(ex.status||"").toLowerCase();
  return st==="finalizado"||st==="aguardando_envio";
}
function execEmAndamento_(ex){
  if(!ex)return false;
  return String(ex.status||"").toLowerCase()==="executando";
}
function execReabertaAindaValida_(ex){
  if(!ex||String(ex.status||"").toLowerCase()!=="reaberto")return false;
  return minutos_(ex.novoHorarioFim)>agoraMinutos_();
}
function telegramJaEnviado_(idExec){
  return PropertiesService.getScriptProperties().getProperty("telegram_vencido_"+idExec)==="1";
}
function marcarTelegramEnviado_(idExec){
  PropertiesService.getScriptProperties().setProperty("telegram_vencido_"+idExec,"1");
}
function mensagemChecklistVencido_(c){
  return [
    "Checklist não feito",
    "Empresa: "+nomeEmpresa_(c.empresaId),
    "Checklist: "+(c.nome||c.id),
    "Prazo: "+(c.horarioFim||"-"),
    "Data: "+dataBR_()
  ].join("\n");
}
function verificarChecklistsVencidos_(empresaId){
  const hoje=dataHoje_(),dia=diaSemana_(),agora=agoraMinutos_();
  const execs=listarExecucoes_(hoje,hoje);
  const porId={};
  execs.forEach(function(e){porId[String(e.idExecucao||"").trim()]=e});
  const enviados=[];

  listar_("checklists").forEach(function(c){
    if(String(c.ativo||"sim").toLowerCase()==="nao")return;
    if(empresaId&&String(c.empresaId||"").trim()!==String(empresaId).trim())return;
    const dias=parseLista_(String(c.dias||"").toLowerCase());
    if(dias.length&&dias.indexOf(dia)===-1)return;
    if(agora<=minutos_(c.horarioFim))return;

    const idExec=execId_(c,hoje);
    const ex=porId[idExec];
    if(execFinalizada_(ex)||execEmAndamento_(ex)||execReabertaAindaValida_(ex)||telegramJaEnviado_(idExec))return;

    const msg=mensagemChecklistVencido_(c);
    const envio=enviarTelegramMensagem_(msg);
    marcarTelegramEnviado_(idExec);
    enviados.push({idExecucao:idExec,idChecklist:c.id,nomeChecklist:c.nome,telegram:envio.codigo});
    log_("telegram_vencido","sistema","",c.id,c.nome,"Telegram vencido: "+envio.codigo+" "+envio.texto);
  });

  return {status:"ok",enviados:enviados.length,itens:enviados};
}
function verificarChecklistsVencidos(){
  return verificarChecklistsVencidos_("");
}
function instalarTriggerTelegramVencidos(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==="verificarChecklistsVencidos")ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("verificarChecklistsVencidos").timeBased().everyMinutes(1).create();
}

function reabrirExecucaoDados_(e){
  const now=new Date();
  const fim=new Date(now.getTime()+60*60*1000);
  const novo=Utilities.formatDate(fim,Session.getScriptTimeZone(),"HH:mm");
  const reabertoEm=Utilities.formatDate(now,Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss");
  const idExec=String(e.parameter.idExecucao||"").trim();
  const idChecklist=String(e.parameter.idChecklist||"").trim();

  const ex=listar_("execucoes").find(r=>String(r.idExecucao).trim()===idExec) || {};
  const c=checklistPorId_(idChecklist);

  const linha={
    idExecucao:idExec,
    data:ex.data||dataHoje_(),
    idChecklist:idChecklist,
    nomeChecklist:ex.nomeChecklist||c.nome||"",
    horario:ex.horario||c.horario||"",
    horarioFim:ex.horarioFim||c.horarioFim||"",
    status:"reaberto",
    login:"",
    nomeUsuario:"",
    turno:ex.turno||"",
    urlPDF:"",
    criadoEm:ex.criadoEm||new Date().toISOString(),
    nomeArquivo:"",
    reabertoPor:e.parameter.login||"",
    reabertoEm:reabertoEm,
    novoHorarioFim:novo
  };

  upsertObj_("execucoes","idExecucao",idExec,linha);
  log_("reabriu",e.parameter.login,e.parameter.nomeUsuario,idChecklist,linha.nomeChecklist,"Reaberto até "+novo);
  return {status:"ok",execucao:linha};
}
function reabrirExecucao_(e){
  const r=reabrirExecucaoDados_(e);
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}
function salvarPdfInterno_(nome,base64){const pasta=DriveApp.getFolderById(PASTA_DRIVE_ID),blob=Utilities.newBlob(Utilities.base64Decode(base64),"application/pdf",nome),arq=pasta.createFile(blob);return{url:arq.getUrl()}}
function log_(tipo,login,nomeUsuario,idChecklist,nomeChecklist,detalhe){aba_("logs").appendRow([new Date().toISOString(),tipo||"",login||"",nomeUsuario||"",idChecklist||"",nomeChecklist||"",detalhe||""]);return ContentService.createTextOutput("ok")}
function enviarTelegramMensagem_(mensagem){
  const resp=UrlFetchApp.fetch("https://api.telegram.org/bot"+TELEGRAM_TOKEN+"/sendMessage",{
    method:"post",
    contentType:"application/json",
    payload:JSON.stringify({chat_id:TELEGRAM_CHAT_ID,text:mensagem}),
    muteHttpExceptions:true
  });
  return {codigo:resp.getResponseCode(),texto:resp.getContentText().slice(0,300)};
}
function enviarTelegram_(mensagem){
  const envio=enviarTelegramMensagem_(mensagem);
  log_("telegram_manual","sistema","","","",envio.codigo+" "+envio.texto);
  return ContentService.createTextOutput("Telegram: "+envio.codigo);
}

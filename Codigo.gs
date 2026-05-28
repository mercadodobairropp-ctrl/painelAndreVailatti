// Painel Operacional Confiança v6.2
const PASTA_DRIVE_ID = "1_00PqHAvoQBvkfhtilBrZNsB6AJV9MtG";
const PLANILHA_ID = "1OViTBjCmDPs56dp2_g6vbIszFau3WNI1LahAbR29X94";
const TELEGRAM_TOKEN = "8414044142:AAHoof4NoOkqiM1FfeY9EmMekfodnqh0LN8";
const TELEGRAM_CHAT_ID = "5426828201";
const ADMIN_MESTRE = "01";
const ABAS={usuarios:["login","senha","nome","tipo","turnosPermitidos"],turnos:["id","nome","ativo"],checklists:["id","nome","descricao","horario","horarioFim","turnos","dias","prioridade","responsaveisPermitidos","tarefas","ativo"],execucoes:["idExecucao","data","idChecklist","nomeChecklist","horario","horarioFim","status","login","nomeUsuario","turno","urlPDF","criadoEm","nomeArquivo","reabertoPor","reabertoEm","novoHorarioFim"],logs:["dataHora","tipo","login","nomeUsuario","idChecklist","nomeChecklist","detalhe"]};
function doGet(e){try{setup_();const acao=e.parameter.acao||"status",cb=e.parameter.callback;let r={status:"ok",mensagem:"Servidor online v6.2"};if(acao==="getUsers")r={status:"ok",usuarios:listar_("usuarios")};if(acao==="getTurnos")r={status:"ok",turnos:listar_("turnos")};if(acao==="getChecklists")r={status:"ok",checklists:listar_("checklists")};if(acao==="getExecucoes")r={status:"ok",execucoes:listarExecucoes_(e.parameter.inicio,e.parameter.fim)};if(acao==="reabrirExecucao")r=reabrirExecucaoDados_(e);const txt=JSON.stringify(r);if(cb)return ContentService.createTextOutput(cb+"("+txt+")").setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON)}catch(err){return ContentService.createTextOutput(JSON.stringify({status:"erro",mensagem:err.toString()})).setMimeType(ContentService.MimeType.JSON)}}
function doPost(e){try{setup_();const a=e.parameter.acao||"";if(a==="telegram")return enviarTelegram_(e.parameter.mensagem||"");if(a==="saveUser")return salvarUsuario_(e);if(a==="saveChecklist")return salvarChecklist_(e);if(a==="saveTurno")return salvarTurno_(e);if(a==="deleteTurno")return deleteTurno_(e);if(a==="toggleChecklist")return toggleChecklist_(e);if(a==="deleteChecklist")return deleteChecklist_(e);if(a==="finalizarExecucao")return finalizarExecucao_(e);if(a==="reabrirExecucao")return reabrirExecucao_(e);if(a==="log")return log_(e.parameter.tipo,e.parameter.login,e.parameter.nomeUsuario,e.parameter.idChecklist,e.parameter.nomeChecklist,e.parameter.detalhe);return ContentService.createTextOutput("Ação desconhecida: "+a)}catch(err){return ContentService.createTextOutput("ERRO: "+err.toString())}}
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

    const existente = novos.findIndex(x => x[0] === login);
    const linha = [login, senha, nome, tipo, turnosPermitidos];

    // login é a referência: se existir repetido, mantém a última linha preenchida
    if (existente >= 1) novos[existente] = linha;
    else novos.push(linha);
  }

  sh.clearContents();
  sh.getRange(1, 1, novos.length, canonical.length).setValues(novos);
}

function setup_(){Object.keys(ABAS).forEach(aba_);seed_();normalizarAbaUsuarios_()}
function seed_(){const u=aba_("usuarios");if(u.getLastRow()===1){u.appendRow(["01","7421","Andre","admin","todos"]);u.appendRow(["02","7421","Katia","operador",""]);u.appendRow(["04","1111","Maria","operador",""]);u.appendRow(["08","0000","Tauna","operador",""])}const t=aba_("turnos");if(t.getLastRow()===1){[["1manha","1º Manhã","sim"],["2manha","2º Manhã","sim"],["1tarde","1º Tarde","sim"],["2tarde","2º Tarde","sim"],["gerencial","Gerencial","sim"]].forEach(r=>t.appendRow(r))}}
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
function salvarUsuario_(e){
  const login=normalizarLogin_(e.parameter.login);
  const ator=normalizarLogin_(e.parameter.atorLogin);
  if(login===ADMIN_MESTRE && ator!==ADMIN_MESTRE) return ContentService.createTextOutput("Admin mestre protegido");

  upsertObj_("usuarios","login",login,{
    login,
    senha:e.parameter.senha||"",
    nome:e.parameter.nome||"",
    tipo:e.parameter.tipo||"operador",
    turnosPermitidos:e.parameter.turnosPermitidos||""
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
  const ativo=String(e.parameter.ativo||"sim").trim()||"sim";
  if(!id||!nome)return ContentService.createTextOutput("Dados incompletos");
  upsertObj_("turnos","id",id,{id,nome,ativo});
  log_("salvou_turno",e.parameter.login,e.parameter.nomeUsuario,id,nome,"Turno salvo");
  return ContentService.createTextOutput("ok");
}
function deleteTurno_(e){
  const id=String(e.parameter.id||"").trim();
  if(id==="gerencial")return ContentService.createTextOutput("Turno Gerencial protegido");
  deleteRow_("turnos","id",id);
  log_("excluiu_turno",e.parameter.login,e.parameter.nomeUsuario,id,"","Turno excluído");
  return ContentService.createTextOutput("ok");
}

function salvarChecklist_(e){upsertObj_("checklists","id",e.parameter.id,{id:e.parameter.id,nome:e.parameter.nome,descricao:e.parameter.descricao,horario:normalizarHora_(e.parameter.horario),horarioFim:normalizarHora_(e.parameter.horarioFim),turnos:e.parameter.turnos,dias:e.parameter.dias,prioridade:e.parameter.prioridade,responsaveisPermitidos:e.parameter.responsaveisPermitidos,tarefas:e.parameter.tarefas,ativo:e.parameter.ativo});log_("salvou_checklist",e.parameter.login,e.parameter.nomeUsuario,e.parameter.id,e.parameter.nome,"Checklist salvo");return ContentService.createTextOutput("ok")}
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
function finalizarExecucao_(e){const pdf=salvarPdfInterno_(e.parameter.nomeArquivo,e.parameter.base64);upsertObj_("execucoes","idExecucao",e.parameter.idExecucao,{idExecucao:e.parameter.idExecucao,data:e.parameter.data,idChecklist:e.parameter.idChecklist,nomeChecklist:e.parameter.nomeChecklist,horario:normalizarHora_(e.parameter.horario),horarioFim:normalizarHora_(e.parameter.horarioFim),status:e.parameter.status,login:e.parameter.login,nomeUsuario:e.parameter.nomeUsuario||nomeUsuarioPorLogin_(e.parameter.login),turno:e.parameter.turno,urlPDF:pdf.url,criadoEm:new Date().toISOString(),nomeArquivo:e.parameter.nomeArquivo,reabertoPor:"",reabertoEm:"",novoHorarioFim:""});log_("finalizou",e.parameter.login,e.parameter.nomeUsuario,e.parameter.idChecklist,e.parameter.nomeChecklist,"PDF: "+pdf.url);return ContentService.createTextOutput(JSON.stringify({status:"ok",urlPDF:pdf.url})).setMimeType(ContentService.MimeType.JSON)}

function checklistPorId_(id){
  const lista=listar_("checklists");
  return lista.find(c=>String(c.id).trim()===String(id).trim()) || {};
}
function dataHoje_(){
  return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd");
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
function enviarTelegram_(mensagem){UrlFetchApp.fetch("https://api.telegram.org/bot"+TELEGRAM_TOKEN+"/sendMessage",{method:"post",contentType:"application/json",payload:JSON.stringify({chat_id:TELEGRAM_CHAT_ID,text:mensagem}),muteHttpExceptions:true});return ContentService.createTextOutput("Telegram enviado")}

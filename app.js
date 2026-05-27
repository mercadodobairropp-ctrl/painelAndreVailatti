function usuarioLogado(){
    try{return JSON.parse(localStorage.getItem("usuarioLogado"));}catch(e){return null;}
}
function exigirLogin(){
    const u = usuarioLogado();
    if(!u){ window.location.href = "login.html"; return null; }
    return u;
}
function hojeISO(){ return new Date().toISOString().split("T")[0]; }
function dataBR(d=new Date()){ return d.toLocaleDateString("pt-BR"); }
function horaBR(d=new Date()){ return d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }
function horaArquivo(d=new Date()){ return d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}).replace(":","-"); }
function horarioParaMinutos(h){ const p=h.split(":"); return parseInt(p[0])*60+parseInt(p[1]); }
function agoraMinutos(){ const a=new Date(); return a.getHours()*60+a.getMinutes(); }
function slug(s){
    return String(s).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
        .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
function chaveChecklist(id){ return `${hojeISO()}_${id}`; }
function getLocalState(id){
    const k = chaveChecklist(id);
    return {
        concluido: localStorage.getItem(k+"_concluido"),
        executando: localStorage.getItem(k+"_executando")
    };
}
function setExecutando(id, usuario){
    localStorage.setItem(chaveChecklist(id)+"_executando", JSON.stringify({
        login:usuario.login, nome:usuario.nome, inicio:new Date().toISOString()
    }));
}
function setConcluido(id, usuario){
    localStorage.setItem(chaveChecklist(id)+"_concluido", JSON.stringify({
        login:usuario.login, nome:usuario.nome, hora:horaBR(), data:dataBR(), fim:new Date().toISOString()
    }));
    localStorage.removeItem(chaveChecklist(id)+"_executando");
}
function postAPI(data){
    const body = new URLSearchParams(data);
    return fetch(APP.API_URL,{method:"POST",mode:"no-cors",body});
}
function tocar(qtd=1){
    for(let i=0;i<qtd;i++){
        setTimeout(()=>{
            try{ navigator.vibrate?.(450); }catch(e){}
            try{ new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play(); }catch(e){}
        }, i*900);
    }
}
function alertaUnico(id,tipo,qtd,msgTelegram=null){
    const k = `${hojeISO()}_${id}_${tipo}_alerta`;
    if(localStorage.getItem(k)) return;
    localStorage.setItem(k,"1");
    tocar(qtd);
    if(msgTelegram){
        postAPI({acao:"telegram", mensagem:msgTelegram});
    }
}
function nomePdf(checklist){
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth()+1).padStart(2,"0");
    const dia = String(agora.getDate()).padStart(2,"0");
    return `${ano}-${mes}-${dia} - ${checklist.nome.toLowerCase()} - ${horaArquivo(agora)}.pdf`;
}
const APP = {
    API_URL: "https://script.google.com/macros/s/AKfycbz4HpzALrOIY7RvaI0S_pC2JT8h_NkXSJHL_1WA30MkLIJ5dR7foRtkE12GUp8E6WJd7w/exec",

    versao: "Master Checklists Sheets v1",

    turnos: [
        { id:"1manha", nome:"1º Manhã" },
        { id:"2manha", nome:"2º Manhã" },
        { id:"1tarde", nome:"1º Tarde" },
        { id:"2tarde", nome:"2º Tarde" },
        { id:"gerencial", nome:"Gerencial" }
    ],

    // Fallback caso a internet falhe. O painel tentará buscar a aba "checklists" da planilha.
    checklistsPadrao: [
        {
            id:"padaria09",
            nome:"Checklist Padaria",
            descricao:"Rotina da padaria no período da manhã",
            horario:"09:00",
            turnos:["1manha", "2manha"],
            dias:["dom","seg","ter","qua","qui","sex","sab"],
            prioridade:"alta",
            ativo:"sim",
            tarefas:[
                "tirar salgados e guardar na geladeira",
                "tirar salgados do dia anterior e colocar para descarte. Anotar quais e quantos descartados",
                "Tirar salgados para venda no dia seguinte, buscar no congelador e deixar na geladeira",
                "Recolher paes, colocar em uma sacola e guardar no congelador do pao",
                "Limpar expositor do pão",
                "Colocar as tres telas fechando o vão de colocar o pão",
                "Limpar expositor de salgado"
            ]
        },
        {
            id:"acougue14",
            nome:"Checklist Açougue",
            descricao:"Verificações operacionais do açougue",
            horario:"14:00",
            turnos:["1tarde"],
            dias:["seg","ter","qua","qui","sex","sab"],
            prioridade:"alta",
            ativo:"sim",
            tarefas:[
                "Verificar se portas das ilhas do açougue estão fechadas",
                "Desligar luz expositora 2 portas açougue",
                "Conferir limpeza geral do setor",
                "Conferir organização dos balcões",
                "Registrar qualquer ocorrência nas observações"
            ]
        },
        {
            id:"fechamento21",
            nome:"Checklist Fechamento",
            descricao:"Rotina completa de fechamento da loja",
            horario:"21:00",
            turnos:["2tarde"],
            dias:["dom","seg","ter","qua","qui","sex","sab"],
            prioridade:"alta",
            ativo:"sim",
            tarefas:[
                "Desligar a luz do movel do salgado",
                "Desligar a luz do movel do pão",
                "Desligar exaustor da cozinha",
                "Verificar se portas da ilha do deposito estao fechadas",
                "Verificar se portas dos freezers do pão estao fechadas",
                "Desligar a luz do expositor de queijos",
                "Desligar a luz do expositor de iogurtes",
                "Desligar a luz do expositor de uma porta azul",
                "Desligar a luz da ilha de congelados",
                "Desligar a luz do expositor 5 portas prata",
                "Verificar se portas das ilhas proximo as bebidas estao fechadas",
                "Verificar se portas da ilha do sorvete estao fechadas",
                "Desligar luzes teto fundos",
                "Desligar luz expositora 3 portas fruteira",
                "Desligar Climatizadora",
                "Fechar janelas da frete",
                "Desligar luzes teto frente",
                "Desligar apartelho de som"
            ]
        },
        {
            id:"gerencial18",
            nome:"Checklist Gerencial",
            descricao:"Conferência gerencial da operação",
            horario:"18:00",
            turnos:["gerencial"],
            dias:["dom","seg","ter","qua","qui","sex","sab"],
            prioridade:"media",
            ativo:"sim",
            tarefas:[
                "Verificar pendências gerais do dia",
                "Conferir checklists atrasados",
                "Verificar ocorrências registradas",
                "Conferir se há setor sem responsável",
                "Registrar observações gerenciais"
            ]
        }
    ]
};
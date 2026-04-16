const CONFIG = {
    TRADICIONAL: [
        {n: "QUERO+ (180ml)", p: 8, v: "180ml"}, {n: "RELAX (300ml)", p: 10, v: "300ml"}, 
        {n: "FAVORITA (440ml)", p: 12, v: "440ml"}, {n: "NOSTALGIA (550ml)", p: 14, v: "550ml"}, {n: "INSANA (770ml)", p: 16, v: "770ml"}
    ],
    ALCOOLICA: [
        {n: "DECOLOU (180ml)", p: 8, v: "180ml"}, {n: "REVOADA (300ml)", p: 10, v: "300ml"}, 
        {n: "SEM JUÍZO (440ml)", p: 12, v: "440ml"}, {n: "AMNÉSIA (550ml)", p: 14, v: "550ml"}, {n: "SURREAL (770ml)", p: 16, v: "770ml"}
    ]
};

let carrinho = [];
let totalVenda = 0;
let db = JSON.parse(localStorage.getItem("mellis_v3")) || [];

// PADRONIZAÇÃO DO ESTOQUE - Remove null/undefined e fixa as chaves corretas
function inicializarEstoque() {
    const padrao = { 
        c180: 0, c300: 0, c440: 0, c550: 0, c770: 0, 
        canudo: 0, colher: 0, guardanapo: 0 
    };
    let salvo = JSON.parse(localStorage.getItem("mellis_estoque"));
    
    // Se não existir ou estiver corrompido (como na sua imagem), ele reseta para o padrão
    if (!salvo || salvo.undefined !== undefined || salvo.c440 === null) {
        localStorage.setItem("mellis_estoque", JSON.stringify(padrao));
        return padrao;
    }
    return salvo;
}

let estoque = inicializarEstoque();

window.onload = () => {
    gerarListaProdutos();
    atualizarSenhaTopo();
    atualizarDisplayEstoque();
    document.getElementById('dataDe').value = new Date().toISOString().split('T')[0];
    document.getElementById('dataAte').value = new Date().toISOString().split('T')[0];
};

// --- ESTOQUE (CORRIGIDO PARA NÃO APARECER UNDEFINED) ---
function atualizarDisplayEstoque() {
    const grid = document.getElementById('grid-estoque-dinamico');
    if(!grid) return;

    const nomes = {
        c180: "Copo 180ml", c300: "Copo 300ml", c440: "Copo 440ml", 
        c550: "Copo 550ml", c770: "Copo 770ml", canudo: "Canudos", 
        colher: "Colheres", guardanapo: "Guardanapos"
    };

    grid.innerHTML = Object.keys(nomes).map(key => `
        <div class="stat-card">
            <span>${nomes[key]}</span>
            <h2>${estoque[key] || 0}</h2>
            <div style="display:flex; gap:10px; justify-content:center">
                <button onclick="ajusteManual('${key}', -1)" style="padding:5px 10px; cursor:pointer">-</button>
                <button onclick="ajusteManual('${key}', 1)" style="padding:5px 10px; cursor:pointer">+</button>
            </div>
        </div>
    `).join('');
}

function ajusteManual(item, qtd) {
    estoque[item] = (parseInt(estoque[item]) || 0) + qtd;
    if(estoque[item] < 0) estoque[item] = 0;
    localStorage.setItem("mellis_estoque", JSON.stringify(estoque));
    atualizarDisplayEstoque();
}

function reporItemEspecifico() {
    const item = document.getElementById('item-repor').value;
    estoque[item] = (parseInt(estoque[item]) || 0) + 50;
    localStorage.setItem("mellis_estoque", JSON.stringify(estoque));
    atualizarDisplayEstoque();
}

// --- VENDAS ---
function gerarListaProdutos() {
    const cat = document.getElementById('categoria').value;
    const select = document.getElementById('produto');
    const selectBebida = document.getElementById('bebida');
    const divBebida = document.getElementById('div-bebida');
    const checksAlcool = document.querySelectorAll('.add-alcool'); 

    if (cat === 'ALCOOLICA') {
        if(divBebida) divBebida.classList.remove('hidden');
        if(selectBebida) selectBebida.disabled = false;
        checksAlcool.forEach(ck => ck.disabled = false);
    } else {
        if(divBebida) divBebida.classList.add('hidden');
        if(selectBebida) { selectBebida.disabled = true; selectBebida.value = ""; }
        checksAlcool.forEach(ck => { ck.disabled = true; ck.checked = false; });
    }
    
    select.innerHTML = CONFIG[cat].map(item => 
        `<option value="${item.p}" data-vol="${item.v}">${item.n} - R$ ${item.p.toFixed(2)}</option>`
    ).join('');
}

function adicionarAoCarrinho() {
    const cat = document.getElementById('categoria').value;
    const bebidaValor = document.getElementById('bebida').value;
    
    // --- TRAVA DE SEGURANÇA: EXIGIR BEBIDA SE FOR ALCOÓLICA ---
    if (cat === 'ALCOOLICA' && (bebidaValor === "" || !bebidaValor)) {
        alert("⚠️ ATENÇÃO: Para categoria ALCOÓLICA, selecione a BASE (Gin, Vodka, etc)!");
        document.getElementById('bebida').focus();
        return; // Para a execução aqui e não adiciona ao carrinho
    }

    const prodSelect = document.getElementById('produto');
    const opt = prodSelect.options[prodSelect.selectedIndex];
    const volume = opt.dataset.vol;
    const nome = opt.text.split(' - ')[0];
    const precoBase = parseFloat(prodSelect.value);
    const qtd = parseInt(document.getElementById('quantidade').value);
    
    let precoBebida = 0;
    if (cat === 'ALCOOLICA') {
        const bUpper = bebidaValor.toUpperCase();
        if (bUpper.includes("WHISKY")) precoBebida = 10;
        else if (bUpper.includes("GIN")) precoBebida = 8;
        else if (bebidaValor !== "") precoBebida = 6;
    }

    const extras = Array.from(document.querySelectorAll('.add-check:checked')).map(ck => ({
        nome: ck.value, 
        preco: parseFloat(ck.dataset.preco)
    }));

    const subtotal = (precoBase + precoBebida + extras.reduce((a,b)=>a+b.preco,0)) * qtd;
    
    carrinho.push({ 
        nome, cat, qtd, precoBase, volume, sabor: document.getElementById('sabor').value,
        bebida: bebidaValor, precoBebida, 
        cobertura: document.getElementById('cobertura').value, 
        acomp: document.getElementById('acompanhamento').value, 
        extras, subtotal 
    });
    
    totalVenda += subtotal;
    atualizarCarrinhoTela();
    document.querySelectorAll('.add-check').forEach(ck => ck.checked = false);
}

function finalizarVenda() {
    const pgto = document.getElementById('formaPagamento').value;
    if(!carrinho.length || !pgto) return alert("Verifique o pedido!");

    carrinho.forEach(item => {
        const keyCopo = "c" + item.volume.replace("ml", "");
        if(estoque[keyCopo] !== undefined) estoque[keyCopo] -= item.qtd;
        estoque.canudo -= item.qtd;
        estoque.colher -= item.qtd;
        estoque.guardanapo -= item.qtd;
    });
    localStorage.setItem("mellis_estoque", JSON.stringify(estoque));

    const venda = {
        data: new Date().toISOString(),
        cliente: document.getElementById('nomeCliente').value || "Cliente",
        senha: gerarSenha(), itens: [...carrinho], total: totalVenda, pgto
    };

    db.push(venda);
    localStorage.setItem("mellis_v3", JSON.stringify(db));
    
    // BACKUP NUVEM
    const urlPlanilha = "https://script.google.com/macros/s/AKfycbzf6O3EaH-H8HjG0wB0Y8L-vHqS-K0-T_H-98U2U4X-8-8/exec";
    fetch(urlPlanilha, { method: 'POST', mode: 'no-cors', body: JSON.stringify(venda) });

    imprimirComanda(venda);
    atualizarSenhaTopo();
    
    carrinho = []; totalVenda = 0;
    document.getElementById('nomeCliente').value = "";
    atualizarCarrinhoTela();
    atualizarDisplayEstoque();
}

// --- RELATÓRIO E FECHAMENTO ---
function fecharCaixaComRelatorio() {
    const agora = new Date();
    const hora = agora.getHours();
    if (hora < 23) alert("📊 Gerando RELATÓRIO PARCIAL.\n\nO reset do sistema só libera após as 23:00.");

    const financeiro = document.getElementById('resFinanceiro').innerText;
    const bases = document.getElementById('resBases').innerText;
    const coberturas = document.getElementById('resCoberturas').innerText;
    const adicionais = document.getElementById('resAdicionais').innerText;
    const sabores = document.getElementById('resSabores').innerText;
    const bruto = document.getElementById('repTotal').innerText;

    // Criamos o HTML que o RawBT vai ler
    const htmlRelatorio = `
        <html><head><style>
            body { font-family: sans-serif; padding: 10px; width: 58mm; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #000; padding: 4px; }
            h1, h2 { text-align: center; font-size: 14px; margin: 5px 0; }
            pre { white-space: pre-wrap; font-size: 10px; margin: 0; }
        </style></head><body>
            <h1>${hora >= 23 ? 'FECHAMENTO' : 'P. RELATÓRIO'}</h1>
            <p style="font-size:10px; text-align:center">MELLIS - ${agora.toLocaleString()}</p>
            <h2>FINANCEIRO</h2><pre>${financeiro}</pre>
            <h2>VENDAS</h2>
            <table>
                <tr><td>SABORES</td><td><pre>${sabores}</pre></td></tr>
                <tr><td>BASES</td><td><pre>${bases}</pre></td></tr>
                <tr><td>EXTRAS</td><td><pre>${coberturas}\n${adicionais}</pre></td></tr>
            </table>
            <h2 style="text-align:right">TOTAL: ${bruto}</h2>
        </body></html>`;

    // COMANDO MÁGICO PARA A IMPRESSORA
    const rawbtUrl = "rawbt:base64," + btoa(unescape(encodeURIComponent(htmlRelatorio)));
    window.location.href = rawbtUrl;

    if (hora >= 23) {
        setTimeout(() => {
            if (confirm("Deseja ZERAR o sistema para amanhã?")) {
                db = [];
                localStorage.setItem("mellis_v3", "[]");
                localStorage.setItem("mellis_senha", JSON.stringify({d: new Date().toLocaleDateString(), n: 0}));
                location.reload();
            }
        }, 2000);
    }
}
    win.document.close();

    // 2. LÓGICA DE FECHAMENTO APÓS AS 23H
    if (hora >= 23) {
        setTimeout(() => {
            if (confirm("⚠️ O Relatório foi gerado.\n\nDeseja ZERAR o sistema (Vendas e Senha) para o próximo dia?")) {
                db = []; 
                localStorage.setItem("mellis_v3", "[]");
                localStorage.setItem("mellis_senha", JSON.stringify({d: new Date().toLocaleDateString(), n: 0}));
                alert("Caixa fechado com sucesso! O sistema será reiniciado.");
                location.reload();
            }
        }, 1500);
    }
}

// --- COMANDA ORIGINAL RESTAURADA ---
function imprimirComanda(venda) {
    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR");
    const logoSrc = "img/logo.png"; 

    // Guardamos o seu HTML original EXATAMENTE como ele é nesta variável
    const conteudoComanda = `
        <html><head><style>
            body { font-family: 'Courier New', monospace; width: 58mm; padding: 2px; font-size: 18px; line-height: 1.3; text-align: center; color: #000; }
            .logo { width: 120px; display: block; margin: 0 auto 5px auto; }
            .divider { border-top: 2px dashed #000; margin: 12px 0; }
            .senha-box { font-size: 32px; font-weight: bold; border: 2px solid #000; padding: 10px; margin: 10px 0; }
            .item-container { text-align: left; margin-bottom: 12px; font-size: 17px; }
            .item-linha { display: flex; justify-content: space-between; font-weight: bold; }
            .sub-item { font-size: 15px; margin-left: 5px; display: flex; justify-content: space-between; }
            .final-msg { font-size: 15px; margin: 20px 0; line-height: 1.4; }
            .total-area { font-size: 20px; font-weight: bold; margin-top: 10px; }
        </style></head><body>
            <img src="${logoSrc}" class="logo">
            <b>RASPADINHA MELLIS</b><br>
            <small>GOSTINHO DE INFÂNCIA</small>
            <div class="divider"></div>
            <div style="font-size:14px">${dataHora}</div>
            <div class="senha-box">SENHA: ${venda.senha}</div>
            <b>CLIENTE: ${venda.cliente}</b>
            <div class="divider"></div>
            ${venda.itens.map(item => `
                <div class="item-container">
                    <div class="item-linha">
                        <span>${item.qtd}x ${item.nome} (${item.sabor})</span>
                        <span>R$ ${(item.precoBase * item.qtd).toFixed(2)}</span>
                    </div>
                    <div class="sub-item"><span>Cob: ${item.cobertura}</span><span>--</span></div>
                    <div class="sub-item"><span>Ac: ${item.acomp}</span><span>--</span></div>
                    ${item.bebida ? `<div class="sub-item"><span>Base: ${item.bebida}</span><span>R$ ${(item.precoBebida * item.qtd).toFixed(2)}</span></div>` : ''}
                    ${item.extras.map(ad => `<div class="sub-item"><span>+ ${ad.nome}</span><span>R$ ${(ad.preco * item.qtd).toFixed(2)}</span></div>`).join('')}
                </div>
                <div class="divider" style="border-top: 1px dotted #000; margin: 5px 0;"></div>
            `).join('')}
            <div class="total-area"><div style="display:flex; justify-content:space-between"><span>TOTAL:</span><span>R$ ${venda.total.toFixed(2)}</span></div></div>
            <div style="text-align: right; font-size: 14px;">PGTO: ${venda.pgto}</div>
            <div class="divider"></div>
            <div class="final-msg"><b>PARABÉNS</b>, você está prestes a vivenciar o verdadeiro GOSTINHO DE INFÂNCIA. Aprecie a <b>RASPADINHA MELLIS</b> e sinta o privilégio dessa experiência.</div>
            <div class="divider"></div>
            <div style="font-weight:bold">SIGA NOSSO INSTAGRAM<br>@raspadinha.mellis</div><br>.
        </body></html>
    `;

    // --- AQUI ESTÁ A MUDANÇA PARA O RAWBT ---
    // Em vez de window.open, enviamos o conteúdo acima direto para o App
    const rawbtUrl = "rawbt:base64," + btoa(unescape(encodeURIComponent(conteudoComanda)));
    window.location.href = rawbtUrl;
}

// --- NAVEGAÇÃO E AUXILIARES ---
function switchSection(id) {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    if(id === 'relatorios') carregarDadosRelatorio();
    if(id === 'estoque') atualizarDisplayEstoque();
}

function atualizarCarrinhoTela() {
    const lista = document.getElementById('listaCarrinho');
    lista.innerHTML = carrinho.map((item, i) => `
        <div style="border-bottom:1px solid #eee; padding:10px 0; font-size:0.8rem">
            <b>${item.qtd}x ${item.nome} (${item.sabor})</b><br>
            <button onclick="removerItem(${i})" style="color:red; border:none; background:none; cursor:pointer">Remover</button>
        </div>
    `).join('');
    document.getElementById('totalDisplay').textContent = totalVenda.toFixed(2);
}

function removerItem(i) {
    totalVenda -= carrinho[i].subtotal;
    carrinho.splice(i, 1);
    atualizarCarrinhoTela();
}

function gerarSenha() {
    let hoje = new Date().toLocaleDateString();
    let s = JSON.parse(localStorage.getItem("mellis_senha")) || {d: hoje, n: 0};
    if(s.d !== hoje) s = {d: hoje, n: 0};
    s.n++;
    localStorage.setItem("mellis_senha", JSON.stringify(s));
    return String(s.n).padStart(3, '0');
}

function atualizarSenhaTopo() {
    let s = JSON.parse(localStorage.getItem("mellis_senha"));
    document.getElementById('display-senha-topo').textContent = s ? String(s.n).padStart(3, '0') : "000";
}

function carregarDadosRelatorio() {
    const deInput = document.getElementById('dataDe').value;
    const ateInput = document.getElementById('dataAte').value;
    const filtrados = db.filter(v => v.data.split('T')[0] >= deInput && v.data.split('T')[0] <= ateInput);

    let resumo = { total: 0, pgtos: {}, bases: {}, cobs: {}, adds: {}, produtos: {}, sabores: {} };
    filtrados.forEach(v => {
        resumo.total += v.total;
        resumo.pgtos[v.pgto] = (resumo.pgtos[v.pgto] || 0) + v.total;
        v.itens.forEach(i => {
            resumo.produtos[i.nome] = (resumo.produtos[i.nome] || 0) + i.qtd;
            resumo.sabores[i.sabor] = (resumo.sabores[i.sabor] || 0) + i.qtd;
            if(i.bebida) resumo.bases[i.bebida] = (resumo.bases[i.bebida] || 0) + i.qtd;
            resumo.cobs[i.cobertura] = (resumo.cobs[i.cobertura] || 0) + i.qtd;
            if(i.extras) i.extras.forEach(ex => resumo.adds[ex.nome] = (resumo.adds[ex.nome] || 0) + i.qtd);
        });
    });

    let top = "-"; let max = 0;
    for (let p in resumo.produtos) { if (resumo.produtos[p] > max) { max = resumo.produtos[p]; top = p; } }

    document.getElementById('repTotal').textContent = "R$ " + resumo.total.toFixed(2);
    document.getElementById('repQtd').textContent = filtrados.length;
    document.getElementById('repTop').textContent = top.toUpperCase();
    
    renderLista('resFinanceiro', resumo.pgtos, true);
    renderLista('resSabores', resumo.sabores);
    renderLista('resBases', resumo.bases);
    renderLista('resCoberturas', resumo.cobs);
    renderLista('resAdicionais', resumo.adds);
}

function renderLista(id, obj, isMoney = false) {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = Object.entries(obj).map(([k, v]) => `<div>${k}: ${isMoney ? 'R$ '+v.toFixed(2) : v + ' un'}</div>`).join('');
}

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

function inicializarEstoque() {
    const padrao = { 
        c180: 0, c300: 0, c440: 0, c550: 0, c770: 0, 
        canudo: 0, colher: 0, guardanapo: 0 
    };
    let salvo = JSON.parse(localStorage.getItem("mellis_estoque"));
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
    if(document.getElementById('dataDe')) document.getElementById('dataDe').value = new Date().toISOString().split('T')[0];
    if(document.getElementById('dataAte')) document.getElementById('dataAte').value = new Date().toISOString().split('T')[0];
};

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
    if (cat === 'ALCOOLICA' && (bebidaValor === "" || !bebidaValor)) {
        alert("⚠️ ATENÇÃO: Selecione a BASE!");
        return;
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
}

function finalizarVenda() {
    const pgto = document.getElementById('formaPagamento').value;
    if(!carrinho.length || !pgto) return alert("Verifique o pedido!");

    carrinho.forEach(item => {
        const keyCopo = "c" + item.volume.replace("ml", "");
        if(estoque[keyCopo] !== undefined) estoque[keyCopo] -= item.qtd;
        estoque.canudo -= item.qtd; estoque.colher -= item.qtd; estoque.guardanapo -= item.qtd;
    });
    localStorage.setItem("mellis_estoque", JSON.stringify(estoque));

    const venda = {
        data: new Date().toISOString(),
        cliente: document.getElementById('nomeCliente').value || "Cliente",
        senha: gerarSenha(), itens: [...carrinho], total: totalVenda, pgto
    };

    db.push(venda);
    localStorage.setItem("mellis_v3", JSON.stringify(db));
    
    imprimirComanda(venda);
    atualizarSenhaTopo();
    
    carrinho = []; totalVenda = 0;
    document.getElementById('nomeCliente').value = "";
    atualizarCarrinhoTela();
}

function imprimirComanda(venda) {
    const logoSrc = "img/logo.png"; 
    const html = `
        <html><head><style>
            body { font-family: 'Courier New', monospace; width: 58mm; padding: 2px; font-size: 16px; text-align: center; color: #000; }
            .divider { border-top: 2px dashed #000; margin: 10px 0; }
            .senha-box { font-size: 28px; font-weight: bold; border: 2px solid #000; padding: 5px; margin: 5px 0; }
            .detalhes { text-align: left; font-size: 14px; }
        </style></head><body>
            <img src="${logoSrc}" style="width:100px"><br>
            <b>RASPADINHA MELLIS</b><br>
            <div class="senha-box">SENHA: ${venda.senha}</div>
            <div class="detalhes">
                <b>CLIENTE:</b> ${venda.cliente}<br>
                ${venda.itens.map(i => `${i.qtd}x ${i.nome} (${i.sabor})`).join('<br>')}
            </div>
            <div class="divider"></div>
            <b>TOTAL: R$ ${venda.total.toFixed(2)}</b>
        </body></html>`;

    window.location.href = "rawbt:base64," + btoa(unescape(encodeURIComponent(html)));
}

function fecharCaixaComRelatorio() {
    const agora = new Date();
    const html = `<html><body style="width:58mm;font-family:sans-serif;font-size:12px;">
        <h2>FECHAMENTO MELLIS</h2>
        ${document.getElementById('resFinanceiro').innerHTML}
        <hr>
        TOTAL: ${document.getElementById('repTotal').innerText}
    </body></html>`;
    window.location.href = "rawbt:base64," + btoa(unescape(encodeURIComponent(html)));

    if (agora.getHours() >= 23) {
        if (confirm("Zerar sistema?")) {
            db = []; localStorage.setItem("mellis_v3", "[]");
            localStorage.setItem("mellis_senha", JSON.stringify({d: new Date().toLocaleDateString(), n: 0}));
            location.reload();
        }
    }
}

function switchSection(id) {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    if(id === 'relatorios') carregarDadosRelatorio();
    if(id === 'estoque') atualizarDisplayEstoque();
}

function atualizarCarrinhoTela() {
    const lista = document.getElementById('listaCarrinho');
    lista.innerHTML = carrinho.map((item, i) => `
        <div style="border-bottom:1px solid #eee; padding:5px; font-size:0.8rem">
            <b>${item.qtd}x ${item.nome}</b> <a href="#" onclick="removerItem(${i})" style="color:red">x</a>
        </div>`).join('');
    document.getElementById('totalDisplay').textContent = totalVenda.toFixed(2);
}

function removerItem(i) {
    totalVenda -= carrinho[i].subtotal; carrinho.splice(i, 1); atualizarCarrinhoTela();
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
    const de = document.getElementById('dataDe').value;
    const ate = document.getElementById('dataAte').value;
    const filtrados = db.filter(v => v.data.split('T')[0] >= de && v.data.split('T')[0] <= ate);
    let total = 0; let pgtos = {};
    filtrados.forEach(v => {
        total += v.total;
        pgtos[v.pgto] = (pgtos[v.pgto] || 0) + v.total;
    });
    document.getElementById('repTotal').textContent = "R$ " + total.toFixed(2);
    document.getElementById('resFinanceiro').innerHTML = Object.entries(pgtos).map(([k, v]) => `<div>${k}: R$ ${v.toFixed(2)}</div>`).join('');
}

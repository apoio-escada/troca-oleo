/* Troca de Óleo – app dos postos – v1.9.0 (14/11/2026) */
'use strict';

/* ============ CONSTANTES E ESTADO ============ */
const CFG = window.CONFIG || {};
const VERSAO_APP = '1.9.0';
const GERAL_PADRAO = {
  MARCA_NOME: 'Postos Pichilau', MARCA_SUBTITULO: 'Troca de Óleo', COR_PRINCIPAL: '#4A1B6D', COR_DESTAQUE: '#FFC20E', COR_SECUNDARIA: '#58595B', ESTOQUE_TOLERANCIA: '0',
  DESCANSO_MINUTOS: '3', DESCANSO_IMAGENS: 'descanso.jpg', DESCANSO_TEXTO: 'Toque na tela para começar', CUPOM_ROTULO_OS: 'OS, O.S., ORDEM DE SERVICO, ORDEM'
};
const TIPOS_VEIC = ['Carro', 'SUV', 'Picape', 'Van/Utilitário', 'Caminhão', 'Carreta/Cavalo mecânico', 'Ônibus', 'Micro-ônibus', 'Moto', 'Máquina/Trator', 'Outro'];
const TIPOS_ITEM = {
  OLEO_MOTOR: 'Óleo do motor', FILTRO_OLEO: 'Filtro de óleo', FILTRO_AR: 'Filtro de ar', FILTRO_COMBUSTIVEL: 'Filtro de combustível',
  FILTRO_CABINE: 'Filtro de cabine', FILTRO_SEPARADOR: 'Filtro separador de água', OLEO_CAMBIO: 'Óleo de câmbio', OLEO_DIFERENCIAL: 'Óleo de diferencial',
  ARLA: 'Arla 32', ADITIVO: 'Aditivo/arrefecimento', GRAXA: 'Graxa', SERVICO: 'Serviço/mão de obra', OUTRO: 'Outro'
};
const PERFIS_NOME = { TROCADOR: 'Trocador de óleo', CAIXA: 'Caixa', IMPORTACAO: 'Importação de estoque', GERENTE: 'Gerente', ADMIN: 'Administrador' };
const MSG_PADRAO = {
  troca: 'Olá, {nome}! Aqui é do {posto}. A troca de óleo do seu veículo {placa} ({modelo}) está prevista para {data}{km_txt}. Quer agendar? É só responder esta mensagem.',
  aniversario: 'Feliz aniversário, {nome}! 🎉 Toda a equipe do {posto} deseja um ótimo dia para você.',
  posvenda: 'Olá, {nome}! Aqui é do {posto}. Como está o veículo {placa} depois da troca de óleo do dia {data}? De 1 a 5, que nota você dá para o nosso atendimento?',
  os: 'Olá, {nome}! Segue o resumo da O.S. {os} do veículo {placa}: total {total}. Obrigado pela preferência! {posto}'
};

const S = { token: null, user: null, posto: null, postos: [], tela: 'inicio', agente: null, osAtual: null, geral: { ...GERAL_PADRAO } };
const D = { clientes: [], veiculos: [], modelos: [], produtos: [], cli: {}, vei: {}, mod: {}, prodCod: {}, prodBar: {}, veiPorCli: {}, veiPorPlaca: {}, ts: '' };

/* ============ UTILITÁRIOS ============ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dig = s => String(s ?? '').replace(/\D/g, '');
const normPlaca = s => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const placaValida = p => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normPlaca(p));
const fmtPlaca = p => { p = normPlaca(p); return /^[A-Z]{3}\d{4}$/.test(p) ? p.slice(0, 3) + '-' + p.slice(3) : p; };
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
const arred = n => Math.round(n * 100) / 100;
const brl = n => num(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtQtd = n => num(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtKm = n => num(n) ? Math.round(num(n)).toLocaleString('pt-BR') + ' km' : '';
function hojeISO() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function somaDiasISO(s, n) { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function dataBR(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; }
function diasAte(s) { if (!s) return null; return Math.round((new Date(s.slice(0, 10) + 'T12:00:00') - new Date(hojeISO() + 'T12:00:00')) / 864e5); }
function fmtDoc(d) { d = dig(d); if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'); return d; }
function docMascarado(d) { d = dig(d); if (d.length === 11) return '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**'; return fmtDoc(d); }
function fmtFone(d) { d = dig(d); if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); return d; }
function cpfOk(c) { if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false; for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if (((s * 10) % 11) % 10 !== +c[t]) return false; } return true; }
function cnpjOk(c) {
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = n => { const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < n; i++) s += +c[i] * p[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === +c[12] && calc(13) === +c[13];
}
const docOk = d => { d = dig(d); return d.length === 11 ? cpfOk(d) : d.length === 14 ? cnpjOk(d) : false; };
const primeiroNome = s => { s = String(s || '').trim().split(/\s+/)[0] || ''; return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); };
const preencher = (tpl, d) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => d[k] !== undefined ? d[k] : m);
function waLink(numero, texto) { let d = dig(numero); if (d.length <= 11) d = '55' + d; return `https://wa.me/${d}${texto ? '?text=' + encodeURIComponent(texto) : ''}`; }
function pode(p) { const ps = (S.user && S.user.perms) || []; return ps.includes('*') || ps.includes(p); }
function nomePosto(cod) {
  cod = cod || S.posto;
  const p = S.postos.find(x => x.Codigo === cod);
  if (S.user && S.user.nomePosto && (cod === S.posto || S.postos.length === 1)) return S.user.nomePosto;
  return p ? p.Nome : (cod || '');
}
function aplicarAparencia() {
  const g = S.geral, r = document.documentElement.style, cor = /^#[0-9a-f]{6}$/i;
  if (cor.test(g.COR_PRINCIPAL)) { r.setProperty('--asfalto', g.COR_PRINCIPAL); const m = $('meta[name=theme-color]'); if (m) m.content = g.COR_PRINCIPAL; }
  if (cor.test(g.COR_DESTAQUE)) r.setProperty('--oleo', g.COR_DESTAQUE);
  if (cor.test(g.COR_SECUNDARIA)) r.setProperty('--cinza', g.COR_SECUNDARIA);
  document.title = (g.MARCA_SUBTITULO || 'Troca de Óleo') + ' – ' + (g.MARCA_NOME || '');
}
function guardarGeral(g) { if (!g) return; S.geral = { ...GERAL_PADRAO, ...g }; ls('to_geral', S.geral); aplicarAparencia(); reiniciarDescanso(); }
const precoDe = (p, pag) => (pag || (S.osAtual && S.osAtual.Pagamento)) === 'PRAZO' && num(p.PrecoPrazo) ? num(p.PrecoPrazo) : num(p.PrecoVenda);
const COMB_PADRAO = [{ nome: 'Gasolina', un: 'L' }, { nome: 'Etanol', un: 'L' }, { nome: 'Diesel', un: 'L' }, { nome: 'ARLA 32 granel', un: 'L' }, { nome: 'Óleo Mobil granel', un: 'L' }];
function combustiveisDe(posto) { try { const l = JSON.parse((S.postos.find(p => p.Codigo === posto) || {}).Combustiveis || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
const listaNomes = s => String(s || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
function postoAtual(cod) { return S.postos.find(p => p.Codigo === (cod || S.posto)) || { Codigo: cod || S.posto, Nome: cod || S.posto || '' }; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function ls(k, v) {
  try {
    if (v === undefined) { const x = localStorage.getItem(k); return x ? JSON.parse(x) : null; }
    if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
  } catch (e) { return null; }
}
const scriptsCarregados = {};
function carregarScript(url) {
  if (!scriptsCarregados[url]) scriptsCarregados[url] = new Promise((ok, falha) => { const s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = () => falha(new Error('Não consegui carregar ' + url)); document.head.appendChild(s); });
  return scriptsCarregados[url];
}
const V = html => { const v = $('#v'); if (v) v.innerHTML = html; };
function placaHtml(p, grande) { return `<span class="placa${grande ? '' : ' mini'}" aria-label="Placa ${esc(fmtPlaca(p))}"><span class="faixa">BRASIL</span><span class="num">${esc(fmtPlaca(p))}</span></span>`; }
function nomeModelo(m) { if (!m) return ''; return [m.Marca, m.Modelo, m.Motor].filter(Boolean).join(' ') + (m.Anos ? ` (${m.Anos})` : ''); }
function resumoFicha(f) { return (f || []).map(i => (TIPOS_ITEM[i.tipo] || i.tipo) + (i.tipo === 'OLEO_MOTOR' && num(i.qtd) ? ` ${fmtQtd(i.qtd)} L` : '')).join(', '); }
function fichaDoVeiculo(v) { if (!v) return []; if (v._ficha && v._ficha.length) return v._ficha; const m = D.mod[v.ModeloId]; return m ? m._ficha : []; }
function parseFicha(s) { if (Array.isArray(s)) return s; try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function adivinharTipo(nome) {
  const n = norm(nome);
  if (/arla/.test(n)) return 'ARLA';
  if (/filtro/.test(n)) {
    if (/cabine|ar condicionado|polen/.test(n)) return 'FILTRO_CABINE';
    if (/separador/.test(n)) return 'FILTRO_SEPARADOR';
    if (/combust|diesel|gasolina/.test(n)) return 'FILTRO_COMBUSTIVEL';
    if (/\bar\b|de ar/.test(n)) return 'FILTRO_AR';
    return 'FILTRO_OLEO';
  }
  if (/graxa/.test(n)) return 'GRAXA';
  if (/aditivo|arrefec|radiador/.test(n)) return 'ADITIVO';
  if (/cambio|transmiss|atf/.test(n)) return 'OLEO_CAMBIO';
  if (/diferencial/.test(n)) return 'OLEO_DIFERENCIAL';
  if (/oleo|lubrificante|\d+w ?\d+|sae/.test(n)) return 'OLEO_MOTOR';
  if (/servico|mao de obra/.test(n)) return 'SERVICO';
  return 'OUTRO';
}

/* ============ AVISOS E JANELAS ============ */
let toastT;
function toast(msg, tipo) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (tipo === 'erro' ? ' erro' : '');
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.className = 'toast oculto'; }, tipo === 'erro' ? 6500 : 3000);
}
async function ocupado(btn, fn) {
  if (btn) { if (btn.disabled) return; btn.disabled = true; }
  try { return await fn(); } catch (e) { toast(e.message || String(e), 'erro'); } finally { if (btn) btn.disabled = false; }
}
const MODAIS = [];
function abrirModal(titulo, html, { aoFechar } = {}) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.style.zIndex = 100 + MODAIS.length;
  el.innerHTML = `<div class="modal-caixa" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="modal-topo"><h2>${esc(titulo)}</h2><button class="x" aria-label="Fechar">×</button></div><div class="modal-corpo">${html}</div></div>`;
  document.body.appendChild(el);
  const m = {
    el, corpo: $('.modal-corpo', el), fechado: false,
    fechar() { if (m.fechado) return; m.fechado = true; el.remove(); const i = MODAIS.indexOf(m); if (i >= 0) MODAIS.splice(i, 1); if (aoFechar) aoFechar(); }
  };
  MODAIS.push(m);
  $('.x', el).onclick = () => m.fechar();
  el.addEventListener('mousedown', e => { if (e.target === el) m.fechar(); });
  setTimeout(() => { const f = $('.modal-corpo input:not([type=checkbox]):not([type=radio]),.modal-corpo select,.modal-corpo textarea', el); if (f) f.focus(); }, 60);
  return m;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && MODAIS.length) MODAIS[MODAIS.length - 1].fechar(); });
function perguntar(titulo, html, botoes = []) {
  return new Promise(res => {
    let feito = false;
    const m = abrirModal(titulo, `${html}<div class="botoes" style="margin-top:1rem">${botoes.map((b, i) => `<button class="btn ${b.classe || ''}" data-bi="${i}">${esc(b.rotulo)}</button>`).join('')}</div>`, { aoFechar: () => { if (!feito) res(null); } });
    const fim = v => { feito = true; m.fechar(); res(v); };
    $$('[data-bi]', m.el).forEach(b => { b.onclick = () => fim(botoes[+b.dataset.bi].valor); });
    $$('[data-valor]', m.el).forEach(b => { b.onclick = () => fim(b.dataset.valor); });
  });
}
const confirmar = (msg, sim = 'Confirmar', classe = 'btn-primario') => perguntar('Confirme', `<p>${esc(msg)}</p>`, [{ rotulo: 'Cancelar', valor: false }, { rotulo: sim, valor: true, classe }]).then(v => !!v);
function pedirTexto(titulo, rotulo, valor = '', tipo = 'text', area = false) {
  return new Promise(res => {
    let feito = false;
    const m = abrirModal(titulo, `<div class="campo"><label for="ptx">${esc(rotulo)}</label>${area ? `<textarea id="ptx">${esc(valor)}</textarea>` : `<input id="ptx" type="${tipo}" value="${esc(valor)}">`}</div><div class="botoes" style="margin-top:1rem"><button class="btn" id="ptC">Cancelar</button><button class="btn btn-primario" id="ptO">Continuar</button></div>`, { aoFechar: () => { if (!feito) res(null); } });
    const ok = () => { const v = $('#ptx', m.el).value.trim(); if (!v) return; feito = true; m.fechar(); res(v); };
    $('#ptO', m.el).onclick = ok;
    $('#ptC', m.el).onclick = () => m.fechar();
    if (!area) $('#ptx', m.el).onkeydown = e => { if (e.key === 'Enter') ok(); };
  });
}

/* ============ SERVIDOR E DADOS ============ */
async function api(acao, dados = {}) {
  let j;
  if (CFG.DEMO && window.DEMO) {
    await new Promise(ok => setTimeout(ok, 120));
    j = window.DEMO.chamar({ acao, token: S.token, posto: S.posto, ...dados });
    if (j.erro === 'SESSAO') { sair(true); throw new Error(j.msg || 'Sessão expirada.'); }
    if (j.erro === 'TROCAR_SENHA') { telaTrocarSenha(true); throw new Error('Defina uma nova senha para continuar.'); }
    return j;
  }
  if (!CFG.SERVIDOR || /COLE/.test(CFG.SERVIDOR)) throw new Error('Servidor não configurado: preencha o arquivo config.js.');
  let r;
  try { r = await fetch(CFG.SERVIDOR, { method: 'POST', body: JSON.stringify({ acao, token: S.token, posto: S.posto, ...dados }) }); }
  catch (e) { throw new Error('Sem conexão com o servidor. Confira a internet e tente de novo.'); }
  try { j = await r.json(); } catch (e) { throw new Error('O servidor respondeu de um jeito inesperado. Tente de novo.'); }
  if (j.erro === 'SESSAO') { sair(true); throw new Error(j.msg || 'Sessão expirada.'); }
  if (j.erro === 'TROCAR_SENHA') { telaTrocarSenha(true); throw new Error('Defina uma nova senha para continuar.'); }
  return j;
}
function salvarSessao() { ls('to_sessao', { token: S.token, user: S.user, posto: S.posto, postos: S.postos }); }
function indexar() {
  D.cli = {}; D.clientes.forEach(c => { D.cli[c.Id] = c; c._n = norm((c.Nome || '') + ' ' + (c.Fantasia || '')); });
  D.mod = {}; D.modelos.forEach(m => { m._ficha = parseFicha(m.Ficha); D.mod[m.Id] = m; });
  D.vei = {}; D.veiPorCli = {}; D.veiPorPlaca = {};
  D.veiculos.forEach(v => { v._ficha = parseFicha(v.Ficha); D.vei[v.Id] = v; (D.veiPorCli[v.ClienteId] = D.veiPorCli[v.ClienteId] || []).push(v); D.veiPorPlaca[v.Placa] = v; });
  if (!pode('ver_compra')) D.produtos.forEach(p => { delete p.PrecoCompra; });
  const imp = D.produtos.filter(p => !p._comb), cods = new Set(imp.map(p => String(p.Codigo)));
  D.produtos = imp.concat(combustiveisDe(S.posto).filter(c => c.ativo !== false).map((c, i) => ({ _comb: true, Codigo: c.codigo || 'GRANEL-' + (i + 1), Nome: c.nome, Unidade: c.un || 'L',
    Grupo: 'COMBUSTÍVEIS E GRANEL', PrecoVenda: String(c.vista || 0), PrecoPrazo: c.prazo === '' || c.prazo === undefined ? '' : String(c.prazo), Estoque: '' })).filter(p => !cods.has(String(p.Codigo))));
  D.prodCod = {}; D.prodBar = {};
  D.produtos.forEach(p => { D.prodCod[String(p.Codigo)] = p; String(p.Barras || '').split(/[;,\s]+/).forEach(b => { if (b) D.prodBar[b] = p; }); p._n = norm(`${p.Nome} ${p.Codigo} ${p.Grupo || ''}`); });
}
const salvarCache = debounce(() => {
  const limpo = a => a.map(x => { const o = { ...x }; delete o._n; delete o._ficha; return o; });
  ls('to_dados_' + S.posto, { clientes: limpo(D.clientes), veiculos: limpo(D.veiculos), modelos: limpo(D.modelos), produtos: limpo(D.produtos), ts: D.ts });
}, 800);
function carregarCache() {
  const c = ls('to_dados_' + S.posto);
  Object.assign(D, { clientes: [], veiculos: [], modelos: [], produtos: [], ts: '' }, c || {});
  indexar();
}
function upsert(lista, obj) {
  const arr = D[lista];
  const i = arr.findIndex(x => x.Id === obj.Id);
  const ativo = !obj.Status || obj.Status === 'ATIVO';
  if (i >= 0) { if (ativo) arr[i] = obj; else arr.splice(i, 1); } else if (ativo) arr.push(obj);
}
function aposSalvar() { indexar(); salvarCache(); }
function aplicarEstoque(l) { if (!l || !l.length) return; l.forEach(e => { const p = D.prodCod[e.Codigo]; if (p) p.Estoque = e.Estoque; }); salvarCache(); }
function marcarSync(estado) { const b = $('#btnSync'); if (!b) return; b.classList.toggle('girando', estado === 'girando'); b.classList.toggle('off', estado === 'off'); b.title = estado === 'off' ? 'Sem conexão – mostrando dados salvos no aparelho' : 'Atualizar dados' + (D.ts ? ' (última: ' + D.ts.slice(0, 16).replace('T', ' ') + ')' : ''); }
async function sincronizar(silencioso) {
  marcarSync('girando');
  try {
    const j = await api('sync', { posto: S.posto });
    if (j.erro) throw new Error(j.erro);
    Object.assign(D, { clientes: j.clientes, veiculos: j.veiculos, modelos: j.modelos, produtos: j.produtos, ts: j.ts });
    indexar(); salvarCache();
    S.user = j.usuario; S.postos = j.postos; S.agente = j.agente; salvarSessao(); guardarGeral(j.geral);
    marcarSync('ok');
    if (!silencioso) toast('Dados atualizados.');
    if (['inicio', 'clientes', 'produtos', 'modelos'].includes(S.tela) && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) render(S.tela, PILHA.length ? PILHA[PILHA.length - 1].arg : undefined);
  } catch (e) { marcarSync('off'); if (!silencioso) toast(e.message, 'erro'); }
}

/* ============ NAVEGAÇÃO ============ */
const PILHA = [];
function podeSairDaOS(tela) {
  if (S.tela !== 'os-form' || !S.osSujo || tela === 'os-form' || tela === 'cliente-form') return true;
  if (!window.confirm('Esta O.S. tem alterações não salvas. Sair mesmo assim?')) return false;
  S.osSujo = false;
  return true;
}
function ir(tela, arg, { substituir } = {}) {
  if (!podeSairDaOS(tela)) return;
  if (substituir && PILHA.length) PILHA[PILHA.length - 1] = { tela, arg };
  else { PILHA.push({ tela, arg }); history.pushState({ n: PILHA.length }, ''); }
  render(tela, arg);
}
function voltar() { if (PILHA.length > 1) history.back(); else ir('inicio', undefined, { substituir: true }); }
window.addEventListener('popstate', () => {
  if (MODAIS.length) { MODAIS[MODAIS.length - 1].fechar(); history.pushState({}, ''); return; }
  if (PILHA.length > 1) {
    if (!podeSairDaOS(PILHA[PILHA.length - 2].tela)) { history.pushState({}, ''); return; }
    PILHA.pop(); const t = PILHA[PILHA.length - 1]; render(t.tela, t.arg);
  }
});
const NAV_DE = { estoque: 'mais', cupom: 'os', cliente: 'clientes', 'cliente-form': 'clientes', 'os-form': 'os', modelos: 'mais', extrato: 'mais', lembretes: 'mais', combustiveis: 'mais', usuarios: 'mais', config: 'mais' };
function render(tela, arg) {
  S.tela = tela;
  $$('#nav button').forEach(b => b.classList.toggle('ativo', b.dataset.t === (NAV_DE[tela] || tela)));
  window.scrollTo(0, 0);
  const f = TELAS[tela];
  if (!f) return;
  Promise.resolve(f(arg)).catch(e => toast(e.message || String(e), 'erro'));
}

/* ============ LOGIN E MOLDURA ============ */
function telaLogin(msg) {
  document.body.className = '';
  $('#app').innerHTML = `<main class="login">
    ${placaHtml('OLE0A26', true)}
    <p class="marca-nome">${esc(S.geral.MARCA_NOME)}</p><h1>${esc(S.geral.MARCA_SUBTITULO)}</h1>
    <form id="fLogin" autocomplete="on">
      <div class="campo"><label for="lUser">Usuário</label><input id="lUser" type="text" autocomplete="username" autocapitalize="none" required value="${esc(ls('to_ultimoLogin') || '')}"></div>
      <div class="campo"><label for="lSenha">Senha</label><input id="lSenha" type="password" autocomplete="current-password" required></div>
      ${msg ? `<p class="erro-campo">${esc(msg)}</p>` : ''}
      <button class="btn btn-oleo" id="lBtn">Entrar</button>
      <button type="button" class="btn-link" id="lEsq" style="align-self:center">Esqueci a senha</button>
    </form>${CFG.DEMO ? `<div class="parecidos peq" style="margin-top:1.2rem"><b>Versão de demonstração.</b> Os dados ficam só neste navegador e os e-mails aparecem na tela.<br>Usuários: <b>admin</b> / admin123, <b>caixa</b> / caixa123, <b>trocador</b> / troca123, <b>estoque</b> / estoque123.<div style="margin-top:.5rem"><button type="button" class="btn btn-peq" id="demoReset">Recomeçar a demonstração</button></div></div>` : ''}</main>`;
  $('#lEsq').onclick = () => esqueciSenha($('#lUser').value.trim().toLowerCase());
  if ($('#demoReset')) $('#demoReset').onclick = async () => { if (await confirmar('Apagar tudo o que foi feito na demonstração e começar de novo?', 'Recomeçar')) { window.DEMO.reset(); location.reload(); } };
  $(ls('to_ultimoLogin') ? '#lSenha' : '#lUser').focus();
  $('#fLogin').onsubmit = e => {
    e.preventDefault();
    ocupado($('#lBtn'), async () => {
      const login = $('#lUser').value.trim().toLowerCase();
      const j = await api('login', { login, senha: $('#lSenha').value });
      if (j.erro) throw new Error(j.erro);
      ls('to_ultimoLogin', login);
      S.token = j.token; S.user = j.usuario; S.postos = j.postos;
      const ult = ls('to_ultimoPosto');
      S.posto = (S.postos.find(p => p.Codigo === ult) || S.postos[0] || {}).Codigo || null;
      salvarSessao();
      if (j.trocarSenha) return telaTrocarSenha(true);
      if (!S.posto) throw new Error('Nenhum posto liberado para este login. Fale com o administrador.');
      entrar();
    });
  };
}
function esqueciSenha(login) {
  const m = abrirModal('Redefinir senha', `<div id="esq1"><p class="peq">Vamos mandar um código de 6 números para o e-mail cadastrado no seu usuário (ou, se não tiver, para o e-mail do administrador).</p>
      <div class="campo"><label for="eqL">Usuário</label><input id="eqL" type="text" autocapitalize="none" value="${esc(login || '')}"></div>
      <div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="eqEnv">Enviar código</button></div></div>
    <div id="esq2" class="oculto"><p class="peq" id="eqPara"></p>
      <div class="campo"><label for="eqC">Código recebido</label><input id="eqC" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>
      <div class="campo" style="margin-top:.6rem"><label for="eqN">Nova senha (mínimo 6)</label><input id="eqN" type="password" autocomplete="new-password"></div>
      <div class="campo" style="margin-top:.6rem"><label for="eqR">Repita a nova senha</label><input id="eqR" type="password" autocomplete="new-password"></div>
      <div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="eqOk">Salvar nova senha</button><button class="btn-link" id="eqDe">Pedir outro código</button></div></div>`);
  const enviar = e => ocupado(e && e.currentTarget, async () => {
    const lg = $('#eqL', m.el).value.trim().toLowerCase();
    if (!lg) throw new Error('Informe o usuário.');
    const j = await api('pedirCodigo', { login: lg });
    if (j.erro) throw new Error(j.erro);
    $('#esq1', m.el).classList.add('oculto'); $('#esq2', m.el).classList.remove('oculto');
    $('#eqPara', m.el).textContent = `Código enviado para ${j.para}${j.doAdmin ? ' (e-mail do administrador, porque este usuário não tem e-mail cadastrado)' : ''}. Vale por 30 minutos.`;
    $('#eqC', m.el).focus();
  });
  $('#eqEnv', m.el).onclick = enviar;
  $('#eqDe', m.el).onclick = () => { $('#esq2', m.el).classList.add('oculto'); $('#esq1', m.el).classList.remove('oculto'); };
  $('#eqOk', m.el).onclick = e => ocupado(e.currentTarget, async () => {
    if ($('#eqN', m.el).value !== $('#eqR', m.el).value) throw new Error('As duas senhas novas não são iguais.');
    const lg = $('#eqL', m.el).value.trim().toLowerCase();
    const j = await api('redefinirSenha', { login: lg, codigo: $('#eqC', m.el).value, senhaNova: $('#eqN', m.el).value });
    if (j.erro) throw new Error(j.erro);
    m.fechar();
    toast('Senha redefinida. Entre com a nova senha.');
    if ($('#lUser')) { $('#lUser').value = lg; $('#lSenha').value = ''; $('#lSenha').focus(); }
  });
}
function telaTrocarSenha(obrigatoria) {
  const html = `<form id="fSenha" style="display:flex;flex-direction:column;gap:.8rem">
      ${obrigatoria ? '<p>Primeiro acesso ou senha redefinida: crie a sua senha.</p>' : ''}
      <div class="campo"><label for="sA">Senha atual</label><input id="sA" type="password" autocomplete="current-password" required></div>
      <div class="campo"><label for="sN">Nova senha (mínimo 6)</label><input id="sN" type="password" autocomplete="new-password" minlength="6" required></div>
      <div class="campo"><label for="sR">Repita a nova senha</label><input id="sR" type="password" autocomplete="new-password" minlength="6" required></div>
      <button class="btn btn-oleo" id="sBtn">Salvar nova senha</button></form>`;
  if (obrigatoria) { document.body.className = ''; $('#app').innerHTML = `<main class="login">${placaHtml('OLE0A26', true)}<p class="marca-nome">${esc(S.geral.MARCA_NOME)}</p><h1>Nova senha</h1>${html}</main>`; }
  else V(`<div class="cab"><h1>Trocar senha</h1></div><div class="bloco">${html}</div>`);
  $('#fSenha').onsubmit = e => {
    e.preventDefault();
    ocupado($('#sBtn'), async () => {
      if ($('#sN').value !== $('#sR').value) throw new Error('As duas senhas novas não são iguais.');
      const j = await api('trocarSenha', { senhaAtual: $('#sA').value, senhaNova: $('#sN').value });
      if (j.erro) throw new Error(j.erro);
      toast('Senha alterada.');
      if (obrigatoria) entrar(); else voltar();
    });
  };
}
function sair(expirou) {
  const tk = S.token;
  S.token = null; S.user = null;
  ls('to_sessao', null);
  Object.keys(localStorage).filter(k => k.startsWith('to_dados_')).forEach(k => ls(k, null));
  if (!expirou && tk && CFG.SERVIDOR && !CFG.DEMO) fetch(CFG.SERVIDOR, { method: 'POST', body: JSON.stringify({ acao: 'sair', token: tk }) }).catch(() => {});
  PILHA.length = 0;
  telaLogin(expirou ? 'Sua sessão expirou. Entre de novo.' : '');
}
function entrar() { montarShell(); carregarCache(); PILHA.length = 0; ir('inicio'); sincronizar(true); }
function montarShell() {
  document.body.className = 'com-nav';
  const sel = S.postos.length > 1
    ? `<select id="selPosto" aria-label="Posto">${S.postos.map(p => `<option value="${esc(p.Codigo)}"${p.Codigo === S.posto ? ' selected' : ''}>${esc(p.Nome)}</option>`).join('')}</select>`
    : '<span style="margin-left:auto"></span>';
  const nav = [
    { t: 'inicio', ic: '⌂', r: 'Início' },
    pode('cadastro') && { t: 'clientes', ic: '👤', r: 'Clientes' },
    pode('os_editar') && { t: 'os', ic: '🧾', r: 'O.S.' },
    { t: 'produtos', ic: '🛢️', r: 'Produtos' },
    pode('dashboard') && { t: 'dashboard', ic: '📊', r: 'Painel' },
    pode('importar') && !pode('cadastro') && { t: 'importar', ic: '⬆️', r: 'Importar' },
    { t: 'mais', ic: '☰', r: 'Mais' }
  ].filter(Boolean);
  $('#app').innerHTML = `<header class="topo${S.postos.length > 1 ? ' multi' : ''}"><button class="marca" id="tMarca" aria-label="Ir para o início">${placaHtml('OLE0A26')}<span class="txt"><b>${esc(nomePosto())}</b><small>👤 ${esc(S.user.nome || S.user.login)}${S.user.nome && !norm(S.user.nome).includes(norm(S.user.login)) ? ' · ' + esc(S.user.login) : ''}</small></span></button>${sel}<button class="sync" id="btnSync" aria-label="Atualizar dados">⟳</button></header>
    <main id="v" tabindex="-1"></main>
    <nav class="nav" id="nav">${nav.map(n => `<button data-t="${n.t}"><span class="ic" aria-hidden="true">${n.ic}</span>${n.r}</button>`).join('')}</nav>`;
  $('#tMarca').onclick = () => ir('inicio');
  $('#btnSync').onclick = () => sincronizar(false);
  $$('#nav button').forEach(b => { b.onclick = () => ir(b.dataset.t); });
  const sp = $('#selPosto');
  if (sp) sp.onchange = () => { S.posto = sp.value; $('#tMarca b').textContent = nomePosto(); ls('to_ultimoPosto', S.posto); salvarSessao(); carregarCache(); ir('inicio'); sincronizar(true); };
}

/* ============ BUSCA E SEMELHANÇA ============ */
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
function simTxt(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = a.split(' '), tb = b.split(' '), sa = new Set(ta);
  const inter = tb.filter(t => sa.has(t)).length;
  const jac = inter / new Set([...ta, ...tb]).size;
  const cont = Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a)) ? 0.82 : 0;
  let lr = 0;
  if (Math.abs(a.length - b.length) <= Math.max(a.length, b.length) * 0.4 && (inter > 0 || a.slice(0, 2) === b.slice(0, 2))) lr = 1 - lev(a, b) / Math.max(a.length, b.length);
  return Math.max(jac, cont, lr);
}
function clienteParecidos(c, placas = [], ignorar) {
  const doc = dig(c.Documento);
  const fones = [dig(c.WhatsApp), dig(c.Fone)].filter(f => f.length >= 8).map(f => f.slice(-8));
  const email = String(c.Email || '').trim().toLowerCase();
  const nome = c.Nome || '', fant = c.Fantasia || '';
  const pl = placas.map(normPlaca).filter(p => p.length >= 7);
  const r = [];
  for (const x of D.clientes) {
    if (x.Id === ignorar) continue;
    let s = 0, mot = '';
    if (doc.length >= 11 && dig(x.Documento) === doc) { s = 1; mot = 'mesmo CPF/CNPJ'; }
    if (s < 1 && pl.length && (D.veiPorCli[x.Id] || []).some(v => pl.includes(v.Placa))) { s = 1; mot = 'mesma placa'; }
    if (s < 0.95 && fones.length && [dig(x.WhatsApp), dig(x.Fone)].filter(f => f.length >= 8).some(f => fones.includes(f.slice(-8)))) { s = 0.95; mot = 'mesmo telefone'; }
    if (s < 0.95 && email && String(x.Email || '').toLowerCase() === email) { s = 0.95; mot = 'mesmo e-mail'; }
    if (norm(nome).length >= 4) {
      const t = Math.max(simTxt(nome, x.Nome), x.Fantasia ? simTxt(nome, x.Fantasia) : 0, fant && x.Fantasia ? simTxt(fant, x.Fantasia) : 0);
      if (t > s) { s = t; mot = t >= 0.99 ? 'mesmo nome' : 'nome parecido'; }
    }
    if (s >= 0.6) r.push({ x, s, mot });
  }
  return r.sort((a, b) => b.s - a.s).slice(0, 6);
}
function modeloParecidos(m, ignorar) {
  const alvo = [m.Marca, m.Modelo, m.Motor].join(' ');
  if (norm(alvo).length < 3) return [];
  return D.modelos.filter(x => x.Id !== ignorar).map(x => {
    let s = Math.max(simTxt(alvo, [x.Marca, x.Modelo, x.Motor].join(' ')), simTxt([m.Marca, m.Modelo].join(' '), [x.Marca, x.Modelo].join(' ')) * 0.95);
    if (m.Tipo && x.Tipo && m.Tipo !== x.Tipo) s *= 0.85;
    return { x, s };
  }).filter(r => r.s >= 0.6).sort((a, b) => b.s - a.s).slice(0, 6);
}
function buscarTudo(q, lim = 25) {
  const qp = normPlaca(q), qd = dig(q), toks = norm(q).split(' ').filter(Boolean);
  const vs = [], cs = [], vistos = new Set(), qt = String(q).trim();
  if (qt) D.clientes.forEach(c => { if (c.Codigo && String(c.Codigo) === qt) { cs.push(c); vistos.add(c.Id); } });
  if (qp.length >= 3) {
    D.veiculos.forEach(v => { const i = v.Placa.indexOf(qp); if (i >= 0) vs.push({ v, o: i }); });
    vs.sort((a, b) => a.o - b.o);
  }
  if (qd.length >= 4) D.clientes.forEach(c => { if (!vistos.has(c.Id) && [c.Documento, c.WhatsApp, c.Fone].some(x => dig(x).includes(qd))) { cs.push(c); vistos.add(c.Id); } });
  if (toks.length && norm(q).length >= 2) D.clientes.forEach(c => { if (!vistos.has(c.Id) && toks.every(t => c._n.includes(t))) cs.push(c); });
  return { vs: vs.slice(0, lim).map(x => x.v), cs: cs.slice(0, lim) };
}
function buscarProdutos(q, lim = 50) {
  q = String(q || '').trim();
  if (!q) return D.produtos.slice(0, lim);
  const ex = produtoExato(q);
  const toks = norm(q).split(' ').filter(Boolean);
  const r = D.produtos.filter(p => p !== ex && toks.every(t => p._n.includes(t)));
  return (ex ? [ex] : []).concat(r).slice(0, lim);
}
function produtoExato(q) { q = String(q || '').trim(); return D.prodCod[q] || D.prodBar[q] || D.prodBar[dig(q)] || null; }
function linhaCliente(c, extra = '') {
  const vs = D.veiPorCli[c.Id] || [];
  return `<button class="linha-btn" data-cli="${esc(c.Id)}"><span class="cresce"><span class="tit">${esc(c.Nome)}${c.Fantasia ? ` <span class="suave">– ${esc(c.Fantasia)}</span>` : ''}</span><span class="sub">${[c.Codigo ? 'cód. ' + c.Codigo : '', docMascarado(c.Documento), fmtFone(c.WhatsApp || c.Fone)].filter(Boolean).map(esc).join(', ')}${extra}</span></span><span>${vs.slice(0, 2).map(v => placaHtml(v.Placa)).join(' ')}${vs.length > 2 ? ` <span class="suave peq">+${vs.length - 2}</span>` : ''}</span></button>`;
}
function linhaVeiculo(v) {
  const c = D.cli[v.ClienteId] || {}, m = D.mod[v.ModeloId];
  return `<button class="linha-btn" data-cli="${esc(v.ClienteId)}">${placaHtml(v.Placa)}<span class="cresce"><span class="tit">${esc(c.Nome || 'Cliente não encontrado')}</span><span class="sub">${esc(nomeModelo(m) || 'Modelo não informado')}</span></span>${seloTroca(v)}</button>`;
}
function seloTroca(v) {
  const d = diasAte(v.ProximaData);
  if (d === null) return '';
  if (d < 0) return `<span class="selo alerta">troca vencida</span>`;
  if (d <= 15) return `<span class="selo oleo">troca em ${d} dia${d === 1 ? '' : 's'}</span>`;
  return '';
}
function ligarCliques(el) { $$('[data-cli]', el).forEach(b => { b.onclick = () => ir('cliente', b.dataset.cli); }); }

/* ============ INÍCIO ============ */
function telaInicio() {
  V(`<section>
      <div class="placa-busca"><div class="faixa"><span>BRASIL</span><span>${esc(nomePosto())}</span></div>
      <input id="bq" type="search" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC1D23" aria-label="Buscar por placa, nome, CPF/CNPJ ou telefone"></div>
      <p class="busca-dica suave peq">Digite a placa, o nome, o CPF/CNPJ ou o telefone.</p>
    </section>
    <div id="bqRes"></div>
    <div class="botoes" style="margin-bottom:1rem">
      ${pode('os_editar') ? '<button class="btn btn-oleo" id="iOS">Nova O.S.</button>' : ''}
      ${pode('cadastro') ? '<button class="btn" id="iCli">Novo cliente</button>' : ''}
    </div>
    <div id="ini"></div>`);
  const inp = $('#bq');
  const mostrar = () => {
    const q = inp.value.trim(), el = $('#bqRes');
    if (q.length < 2) { el.innerHTML = ''; return; }
    const { vs, cs } = buscarTudo(q);
    if (!vs.length && !cs.length) {
      el.innerHTML = `<div class="bloco"><p class="vazio">Nenhum cadastro encontrado para “${esc(q)}”.</p>${pode('cadastro') ? '<div class="botoes" style="justify-content:center"><button class="btn btn-oleo" id="bqNovo">Cadastrar este cliente</button></div>' : ''}</div>`;
      const b = $('#bqNovo');
      if (b) b.onclick = () => {
        const preset = placaValida(q) ? { placa: normPlaca(q) } : (dig(q).length >= 11 && dig(q).length === q.replace(/[\s.\-/]/g, '').length ? { Documento: dig(q) } : (dig(q).length >= 10 && /^[\d\s()+-]+$/.test(q) ? { WhatsApp: dig(q) } : { Nome: q }));
        ir('cliente-form', { preset });
      };
      return;
    }
    el.innerHTML = `<div class="bloco"><ul class="lista">${vs.map(v => `<li>${linhaVeiculo(v)}</li>`).join('')}${cs.map(c => `<li>${linhaCliente(c)}</li>`).join('')}</ul></div>`;
    ligarCliques(el);
  };
  inp.oninput = debounce(mostrar, 140);
  inp.onkeydown = e => { if (e.key === 'Enter') { const b = $$('#bqRes [data-cli]'); if (b.length === 1) b[0].click(); } };
  if ($('#iOS')) $('#iOS').onclick = () => { S.osAtual = null; ir('os-form', {}); };
  if ($('#iCli')) $('#iCli').onclick = () => ir('cliente-form', {});
  painelInicio();
}
async function painelInicio() {
  const el = $('#ini');
  const partes = [];
  const ag = S.agente;
  partes.push(`<div class="bloco"><h3>Impressoras do posto</h3>${ag && ag.agentes && ag.agentes.length ? ag.agentes.map(a => `<p class="status-agente ${a.online ? 'on' : 'off'} peq" style="margin:.2rem 0">${esc(a.nome)} (${esc(a.destinos.join(' e '))}): ${a.online ? 'ligado' : 'desligado'}</p>`).join('') : `<p class="status-agente off peq">Nenhum agente impressor instalado neste posto</p>`}<p class="suave peq">Dados do aparelho: ${D.ts ? 'atualizados em ' + esc(dataBR(D.ts) + ' ' + D.ts.slice(11, 16)) : 'ainda não baixados'} – ${D.clientes.length} clientes, ${D.produtos.length} produtos.</p></div>`);
  el.innerHTML = '<div id="iniOS"></div><div id="iniLem"></div><div id="iniEst"></div>' + partes.join('');
  if (pode('ver_compra')) api('estoqueLotes', { limite: 1 }).then(j => {
    const l = j.lista && j.lista[0];
    if (!l || !$('#iniEst')) return;
    $('#iniEst').innerHTML = `<div class="bloco"><div class="cab"><h3>Estoque</h3><button class="btn btn-peq" id="iEst">Histórico</button></div><p class="peq">Última importação em ${dataBR(l.Data)} ${esc(l.Data.slice(11, 16))} por ${esc(l.Usuario)}: ${esc(l.Entradas)} entrada(s), ${+l.Divergencias ? `<b class="erro-campo">${esc(l.Divergencias)} divergência(s)</b>` : 'nenhuma divergência'}.</p></div>`;
    $('#iEst').onclick = () => ir('estoque', { lote: l.Lote });
  }).catch(() => {});
  if (pode('os_editar')) api('listarOS', { status: 'ABERTA', limite: 20 }).then(j => {
    if (j.erro || !$('#iniOS')) return;
    $('#iniOS').innerHTML = `<div class="bloco"><div class="cab"><h3>O.S. abertas</h3><span class="selo">${j.lista.length}</span></div>${j.lista.length ? `<ul class="lista">${j.lista.map(linhaOS).join('')}</ul>` : '<p class="suave peq">Nenhuma O.S. aberta.</p>'}</div>`;
    ligarOS($('#iniOS'));
  }).catch(() => {});
  if (pode('lembretes')) api('lembretes', { contar: true }).then(j => {
    if (j.erro || !$('#iniLem') || !j.total) return;
    const c = j.contagem;
    $('#iniLem').innerHTML = `<div class="bloco"><div class="cab"><h3>Lembretes para enviar</h3><button class="btn btn-peq btn-oleo" id="iLem">Abrir</button></div><p>${c.TROCA || 0} troca(s) de óleo, ${c.ANIVERSARIO || 0} aniversário(s), ${c.POSVENDA || 0} pós-venda(s).</p></div>`;
    $('#iLem').onclick = () => ir('lembretes');
  }).catch(() => {});
}

/* ============ CLIENTES ============ */
function telaClientes() {
  V(`<div class="cab"><h1>Clientes</h1>${pode('cadastro') ? '<button class="btn btn-oleo" id="cNovo">Novo cliente</button>' : ''}</div>
    <input type="search" id="cq" placeholder="Nome, código B2Click, CPF/CNPJ, telefone ou placa" autocomplete="off">
    <div class="bloco" style="margin-top:.8rem"><ul class="lista" id="cLista"></ul></div>`);
  const lista = () => {
    const q = $('#cq').value.trim();
    let html;
    if (q.length >= 2) { const { vs, cs } = buscarTudo(q, 60); html = vs.map(v => `<li>${linhaVeiculo(v)}</li>`).join('') + cs.map(c => `<li>${linhaCliente(c)}</li>`).join(''); }
    else html = [...D.clientes].sort((a, b) => (a.AtualizadoEm < b.AtualizadoEm ? 1 : -1)).slice(0, 40).map(c => `<li>${linhaCliente(c)}</li>`).join('');
    $('#cLista').innerHTML = html || `<li class="vazio">${D.clientes.length ? 'Nada encontrado.' : 'Nenhum cliente cadastrado ainda. Toque em Novo cliente.'}</li>`;
    ligarCliques($('#cLista'));
  };
  $('#cq').oninput = debounce(lista, 150);
  if ($('#cNovo')) $('#cNovo').onclick = () => ir('cliente-form', {});
  lista();
}
function cartaoVeiculo(v) {
  const m = D.mod[v.ModeloId], f = fichaDoVeiculo(v);
  return `<div class="veic"><div class="veic-topo">${placaHtml(v.Placa, true)}<div class="cresce" style="flex:1;min-width:10rem"><b>${esc(nomeModelo(m) || 'Modelo não informado')}</b><br><span class="suave peq">${esc(m ? m.Tipo : '')}${v.Ano ? ', ano ' + esc(v.Ano) : ''}${num(v.KmAtual) ? ', ' + fmtKm(v.KmAtual) : ''}</span></div>${seloTroca(v)}</div>
    <p class="peq" style="margin:.5rem 0 .2rem">${v.UltimaTrocaData ? `Última troca: ${dataBR(v.UltimaTrocaData)}${num(v.UltimaTrocaKm) ? ' com ' + fmtKm(v.UltimaTrocaKm) : ''}.` : 'Sem troca registrada.'}${v.ProximaData ? ` Próxima: ${dataBR(v.ProximaData)}${num(v.ProximaKm) ? ' ou ' + fmtKm(v.ProximaKm) : ''}.` : ''}</p>
    <p class="suave peq" style="margin:0 0 .5rem">Ficha${v._ficha && v._ficha.length ? ' própria' : ' do modelo'}: ${esc(resumoFicha(f) || 'não cadastrada')}</p>
    <div class="botoes">${pode('os_editar') ? `<button class="btn btn-peq btn-oleo" data-os="${esc(v.Id)}">Nova O.S.</button>` : ''}${pode('cadastro') ? `<button class="btn btn-peq" data-ficha="${esc(v.Id)}">Ficha</button>` : ''}</div></div>`;
}
async function telaCliente(id) {
  const c = D.cli[id];
  if (!c) { V('<p class="vazio">Cliente não encontrado neste aparelho. Toque em ⟳ para atualizar os dados.</p>'); return; }
  const vs = D.veiPorCli[id] || [];
  const info = [
    ['Código B2Click', c.Codigo], ['CPF/CNPJ', fmtDoc(c.Documento)], ['WhatsApp', fmtFone(c.WhatsApp)], ['Telefone', fmtFone(c.Fone)], ['E-mail', c.Email],
    ['Aniversário', c.Nascimento ? dataBR(c.Nascimento).slice(0, 5) : ''], ['Mensagens', c.AceitaMsg === 'SIM' ? 'Autorizou receber' : 'Não autorizou'], ['Observação', c.Obs]
  ].filter(x => x[1]);
  V(`<div class="cab"><div><h1>${esc(c.Nome)}</h1>${c.Fantasia ? `<p class="suave" style="margin:0">${esc(c.Fantasia)}</p>` : ''}</div>${pode('cadastro') ? '<button class="btn" id="cEd">Editar</button>' : ''}</div>
    <div class="bloco"><div class="campos">${info.map(([k, v]) => `<div><span class="rot">${k}</span><br>${esc(v)}</div>`).join('')}</div>
      <div class="botoes" style="margin-top:.8rem">${c.WhatsApp ? `<a class="btn btn-peq" href="${waLink(c.WhatsApp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${c.WhatsApp || c.Fone ? `<a class="btn btn-peq" href="tel:${dig(c.Fone || c.WhatsApp)}">Ligar</a>` : ''}${c.Email ? `<a class="btn btn-peq" href="mailto:${esc(c.Email)}">E-mail</a>` : ''}</div></div>
    <div class="bloco"><div class="cab"><h2>Veículos</h2>${pode('cadastro') ? '<button class="btn btn-peq" id="cPlaca">+ Placa</button>' : ''}</div><div id="cVeic">${vs.length ? vs.map(cartaoVeiculo).join('') : '<p class="vazio">Nenhuma placa cadastrada.</p>'}</div></div>
    <div class="bloco"><div class="cab"><h2>Ordens de serviço</h2>${pode('extrato') ? '<button class="btn btn-peq" id="cExt">Extrato</button>' : ''}</div><div id="cHist"><p class="suave peq">Carregando…</p></div></div>`);
  if ($('#cEd')) $('#cEd').onclick = () => ir('cliente-form', { id });
  if ($('#cExt')) $('#cExt').onclick = () => ir('extrato', { clienteId: id });
  if ($('#cPlaca')) $('#cPlaca').onclick = () => veiculoRapido(id).then(v => { if (v) render('cliente', id); });
  $$('[data-os]').forEach(b => { b.onclick = () => { S.osAtual = null; ir('os-form', { clienteId: id, veiculoId: b.dataset.os }); }; });
  $$('[data-ficha]').forEach(b => { b.onclick = () => editarFichaVeiculo(D.vei[b.dataset.ficha]).then(ok => { if (ok) render('cliente', id); }); });
  try {
    const j = await api('listarOS', { posto: 'TODOS', clienteId: id, limite: 50 });
    if (!$('#cHist')) return;
    if (j.erro) { $('#cHist').innerHTML = `<p class="erro-campo">${esc(j.erro)}</p>`; return; }
    $('#cHist').innerHTML = j.lista.length ? `<ul class="lista">${j.lista.map(linhaOS).join('')}</ul>` : '<p class="suave peq">Nenhuma O.S. ainda.</p>';
    ligarOS($('#cHist'));
  } catch (e) { if ($('#cHist')) $('#cHist').innerHTML = `<p class="suave peq">${esc(e.message)}</p>`; }
}

function telaClienteForm(arg = {}) {
  const orig = arg.id ? D.cli[arg.id] : null;
  const c = orig ? { ...orig } : { Codigo: '', Nome: '', Fantasia: '', Documento: '', WhatsApp: '', Fone: '', Email: '', Nascimento: '', AceitaMsg: 'NAO', Obs: '', ...(arg.preset || {}) };
  delete c.placa;
  const vs = orig ? (D.veiPorCli[orig.Id] || []).map(v => ({ ...v, _k: v.Id })) : [];
  if (!orig && arg.preset && arg.preset.placa) vs.push({ _k: 'n' + Date.now(), Placa: arg.preset.placa, ModeloId: '', Ano: '', KmAtual: '' });
  if (!vs.length && !orig) vs.push({ _k: 'n' + Date.now(), Placa: '', ModeloId: '', Ano: '', KmAtual: '' });

  V(`<div class="cab"><h1>${orig ? 'Editar cliente' : 'Novo cliente'}</h1></div>
    <div class="bloco"><div class="campos">
      <div class="campo"><label for="fCod">Código do cliente no B2Click</label><input id="fCod" type="text" value="${esc(c.Codigo || '')}" autocomplete="off" placeholder="mesmo código do sistema"></div>
      <div class="campo"><label for="fDoc">CPF ou CNPJ</label><input id="fDoc" type="text" inputmode="numeric" value="${esc(fmtDoc(c.Documento))}"><span class="erro-campo" id="eDoc"></span></div>
      <div class="campo"><label for="fNome">Nome ou razão social *</label><input id="fNome" type="text" value="${esc(c.Nome)}" autocomplete="off"></div>
      <div class="campo"><label for="fFant">Nome fantasia</label><input id="fFant" type="text" value="${esc(c.Fantasia)}" autocomplete="off"></div>
      <div class="campo"><label for="fWpp">WhatsApp</label><input id="fWpp" type="tel" value="${esc(fmtFone(c.WhatsApp))}" placeholder="(81) 99999-9999"></div>
      <div class="campo"><label for="fFone">Telefone</label><input id="fFone" type="tel" value="${esc(fmtFone(c.Fone))}"></div>
      <div class="campo"><label for="fEmail">E-mail</label><input id="fEmail" type="email" value="${esc(c.Email)}" autocapitalize="none"></div>
      <div class="campo"><label for="fNasc">Data de nascimento</label><input id="fNasc" type="date" value="${esc(String(c.Nascimento || '').slice(0, 10))}"></div>
      <div class="campo largo"><label for="fObs">Observação</label><input id="fObs" type="text" value="${esc(c.Obs)}"></div>
      <label class="check campo largo"><input type="checkbox" id="fAceita" ${c.AceitaMsg === 'SIM' ? 'checked' : ''}><span>O cliente autorizou receber mensagens (lembrete de troca, aniversário e pós-venda) por WhatsApp e e-mail.</span></label>
    </div><div id="fPar"></div></div>
    <div class="bloco"><div class="cab"><h2>Placas</h2><button class="btn btn-peq" id="fAddV">+ Adicionar placa</button></div><div id="fVeics"></div></div>
    <div class="barra-acoes"><button class="btn" id="fCanc">Cancelar</button><button class="btn btn-oleo" id="fSalvar">Salvar cliente</button></div>`);

  const ler = () => ({
    ...c, Codigo: $('#fCod').value.trim(), Documento: dig($('#fDoc').value), Nome: $('#fNome').value.trim(), Fantasia: $('#fFant').value.trim(), WhatsApp: dig($('#fWpp').value),
    Fone: dig($('#fFone').value), Email: $('#fEmail').value.trim().toLowerCase(), Nascimento: $('#fNasc').value, Obs: $('#fObs').value.trim(), AceitaMsg: $('#fAceita').checked ? 'SIM' : 'NAO'
  });
  const placasForm = () => vs.filter(v => !v.remover).map(v => normPlaca(v.Placa));

  const mostrarParecidos = () => {
    const par = clienteParecidos(ler(), placasForm(), orig && orig.Id);
    $('#fPar').innerHTML = par.length ? `<div class="parecidos"><h3>Cadastros parecidos</h3><ul class="lista">${par.map(r => `<li><span><b>${esc(r.x.Nome)}</b>${r.x.Fantasia ? ' – ' + esc(r.x.Fantasia) : ''}<br><span class="peq">${esc(r.mot)}${r.x.Documento ? ', ' + esc(docMascarado(r.x.Documento)) : ''}${(D.veiPorCli[r.x.Id] || []).length ? ', placas ' + (D.veiPorCli[r.x.Id] || []).map(v => fmtPlaca(v.Placa)).join(' ') : ''}</span></span><button class="btn btn-peq" data-abrir="${esc(r.x.Id)}">Abrir</button></li>`).join('')}</ul></div>` : '';
    $$('[data-abrir]', $('#fPar')).forEach(b => { b.onclick = () => ir('cliente', b.dataset.abrir); });
  };
  const deb = debounce(mostrarParecidos, 250);
  ['#fDoc', '#fNome', '#fFant', '#fWpp', '#fFone', '#fEmail'].forEach(s => { $(s).addEventListener('input', deb); });
  $('#fDoc').onblur = () => { const d = dig($('#fDoc').value); $('#fDoc').value = fmtDoc(d); $('#eDoc').textContent = d && !docOk(d) ? 'CPF/CNPJ inválido – confira os números.' : ''; };
  $('#fWpp').onblur = () => { $('#fWpp').value = fmtFone($('#fWpp').value); };
  $('#fFone').onblur = () => { $('#fFone').value = fmtFone($('#fFone').value); };

  const desenharVeics = () => {
    const el = $('#fVeics');
    const ativos = vs.filter(v => !v.remover);
    el.innerHTML = ativos.length ? ativos.map(v => {
      const m = D.mod[v.ModeloId];
      const p = normPlaca(v.Placa);
      const dono = p && D.veiPorPlaca[p] && D.veiPorPlaca[p].ClienteId !== (orig && orig.Id) ? D.cli[D.veiPorPlaca[p].ClienteId] : null;
      return `<div class="veic" data-k="${esc(v._k)}"><div class="campos">
        <div class="campo"><label>Placa</label><input type="text" data-c="Placa" value="${esc(fmtPlaca(v.Placa))}" autocapitalize="characters" maxlength="8" placeholder="ABC1D23">${p && !placaValida(p) ? '<span class="erro-campo">Placa incompleta ou inválida.</span>' : ''}${dono ? `<span class="erro-campo">Esta placa está no cadastro de ${esc(dono.Nome)}.</span>` : ''}</div>
        <div class="campo"><label>Modelo</label><button class="btn" data-modelo style="justify-content:flex-start">${m ? esc(nomeModelo(m)) : 'Escolher modelo'}</button></div>
        <div class="campo"><label>Ano</label><input type="text" inputmode="numeric" data-c="Ano" value="${esc(v.Ano || '')}" maxlength="9"></div>
        <div class="campo"><label>KM atual</label><input type="text" inputmode="numeric" data-c="KmAtual" value="${esc(v.KmAtual || '')}"></div>
      </div><p class="suave peq" style="margin:.5rem 0">Ficha${(v._ficha && v._ficha.length) ? ' própria' : ' do modelo'}: ${esc(resumoFicha(fichaDoVeiculo(v)) || 'não cadastrada')}</p>
      <div class="botoes"><button class="btn btn-peq" data-ficha>Ficha (óleo e filtros)</button><button class="btn btn-peq btn-perigo" data-rem>Tirar placa</button></div></div>`;
    }).join('') : '<p class="suave peq">Nenhuma placa. Toque em + Adicionar placa.</p>';
    $$('.veic', el).forEach(box => {
      const v = vs.find(x => x._k === box.dataset.k);
      $$('[data-c]', box).forEach(i => {
        i.oninput = () => { v[i.dataset.c] = i.dataset.c === 'KmAtual' ? dig(i.value) : i.value; if (i.dataset.c === 'Placa') deb(); };
        if (i.dataset.c === 'Placa') i.onblur = () => { v.Placa = normPlaca(i.value); desenharVeics(); mostrarParecidos(); };
      });
      $('[data-modelo]', box).onclick = () => escolherModelo().then(m => { if (m) { v.ModeloId = m.Id; desenharVeics(); } });
      $('[data-ficha]', box).onclick = () => editarFichaVeiculo(v, true).then(() => desenharVeics());
      $('[data-rem]', box).onclick = () => { if (v.Id) v.remover = true; else vs.splice(vs.indexOf(v), 1); desenharVeics(); };
    });
  };
  $('#fAddV').onclick = () => { vs.push({ _k: 'n' + Date.now(), Placa: '', ModeloId: '', Ano: '', KmAtual: '' }); desenharVeics(); const ins = $$('#fVeics [data-c=Placa]'); if (ins.length) ins[ins.length - 1].focus(); };
  $('#fCanc').onclick = () => voltar();
  desenharVeics();
  mostrarParecidos();

  $('#fSalvar').onclick = e => ocupado(e.currentTarget, async () => {
    let dados = ler();
    if (!dados.Nome) throw new Error('Informe o nome ou a razão social.');
    if (dados.Documento && !docOk(dados.Documento)) throw new Error('CPF/CNPJ inválido.');
    const enviar = vs.filter(v => v.Id || normPlaca(v.Placa));
    const ruim = enviar.find(v => !v.remover && !placaValida(v.Placa));
    if (ruim) throw new Error('Confira a placa ' + (ruim.Placa || '(vazia)') + '.');

    if (!dados.Id) {
      const par = clienteParecidos(dados, placasForm()).filter(r => r.s >= 0.8);
      if (par.length) {
        const r = await perguntar('Cadastro parecido encontrado', `<p>Já existe cadastro parecido. É o mesmo cliente?</p><ul class="lista">${par.map(p => `<li style="padding:.6rem 0"><b>${esc(p.x.Nome)}</b> <span class="selo oleo">${esc(p.mot)}</span><br><span class="suave peq">${esc([docMascarado(p.x.Documento), fmtFone(p.x.WhatsApp || p.x.Fone), (D.veiPorCli[p.x.Id] || []).map(v => fmtPlaca(v.Placa)).join(' ')].filter(Boolean).join(', '))}</span><div style="margin-top:.4rem"><button class="btn btn-peq btn-oleo" data-valor="${esc(p.x.Id)}">É o mesmo: unificar com este</button></div></li>`).join('')}</ul>`, [{ rotulo: 'É diferente: salvar novo', valor: 'NOVO', classe: 'btn-primario' }]);
        if (r === null) return;
        if (r !== 'NOVO') dados = mesclarCliente(D.cli[r], dados);
      }
    } else if (pode('unificar')) {
      const par = clienteParecidos(dados, placasForm(), dados.Id).filter(r => r.s >= 0.9);
      if (par.length) {
        const r = await perguntar('Possível cadastro duplicado', `<p>Este cliente parece estar cadastrado mais de uma vez. Quer unificar? As placas e O.S. do outro cadastro passam para este.</p><ul class="lista">${par.map(p => `<li style="padding:.6rem 0"><b>${esc(p.x.Nome)}</b> <span class="selo oleo">${esc(p.mot)}</span><div style="margin-top:.4rem"><button class="btn btn-peq btn-oleo" data-valor="${esc(p.x.Id)}">Unificar com este</button></div></li>`).join('')}</ul>`, [{ rotulo: 'São diferentes: só salvar', valor: 'SALVAR', classe: 'btn-primario' }]);
        if (r === null) return;
        if (r !== 'SALVAR') {
          const u = await api('unificarClientes', { manterId: dados.Id, removerId: r });
          if (u.erro) throw new Error(u.erro);
          D.clientes = D.clientes.filter(x => x.Id !== u.removidoId);
          u.veiculos.forEach(v => upsert('veiculos', v));
          dados = mesclarCliente(u.cliente, dados);
          aposSalvar();
          toast('Cadastros unificados.');
        }
      }
    }
    await gravarCliente(dados, enviar, arg);
  });
}
function mesclarCliente(existente, novo) {
  const r = { ...existente };
  ['Codigo', 'Documento', 'Nome', 'Fantasia', 'WhatsApp', 'Fone', 'Email', 'Nascimento', 'Obs'].forEach(k => { if (novo[k]) r[k] = novo[k]; });
  if (novo.AceitaMsg === 'SIM') r.AceitaMsg = 'SIM';
  return r;
}
function veiculoParaEnviar(v) {
  const o = { Id: v.Id || '', Placa: normPlaca(v.Placa), ModeloId: v.ModeloId || '', Ano: v.Ano || '', KmAtual: dig(v.KmAtual), remover: !!v.remover };
  if (v._fichaEditada) o.Ficha = v._ficha || [];
  return o;
}
async function gravarCliente(dados, veics, arg = {}) {
  const limpo = { ...dados }; delete limpo._n;
  let j = await api('salvarCliente', { cliente: limpo, veiculos: veics.map(veiculoParaEnviar) });
  if (j.erro === 'DUPLICADO') {
    const r = await perguntar('CPF/CNPJ já cadastrado', `<p><b>${esc(j.existente.Nome)}</b> já está cadastrado com este CPF/CNPJ.</p>`, [{ rotulo: 'Abrir o cadastro existente', valor: 'ABRIR' }, { rotulo: 'Unificar: juntar estes dados e placas nele', valor: 'UNIR', classe: 'btn-oleo' }]);
    if (r === 'ABRIR') return ir('cliente', j.existente.Id);
    if (r !== 'UNIR') return;
    return gravarCliente(mesclarCliente(D.cli[j.existente.Id] || j.existente, dados), veics.filter(v => !v.Id), arg);
  }
  if (j.erro) throw new Error(j.msg || j.erro);
  upsert('clientes', j.cliente);
  j.veiculos.forEach(v => upsert('veiculos', v));
  aposSalvar();
  for (const e of j.erros || []) {
    if (e.erro === 'PLACA_EXISTE') {
      if (await confirmar(`${e.msg} Passar esta placa para ${j.cliente.Nome}?`, 'Passar a placa')) {
        const orig = veics.find(v => normPlaca(v.Placa) === e.placa) || { Placa: e.placa };
        const t = await api('salvarVeiculo', { veiculo: { ...veiculoParaEnviar(orig), Id: '', ClienteId: j.cliente.Id, transferir: true } });
        if (t.erro) toast(t.msg || t.erro, 'erro'); else { upsert('veiculos', t.veiculo); aposSalvar(); }
      }
    } else toast(e.erro, 'erro');
  }
  toast('Cliente salvo.');
  if (arg.aoSalvar) arg.aoSalvar(j.cliente);
  else ir('cliente', j.cliente.Id, { substituir: true });
}

/* ============ VEÍCULOS E FICHAS ============ */
function veiculoRapido(clienteId) {
  return new Promise(res => {
    let feito = false, modeloId = '';
    const m = abrirModal('Nova placa', `<div class="campos">
      <div class="campo"><label for="vP">Placa</label><input id="vP" type="text" autocapitalize="characters" maxlength="8" placeholder="ABC1D23"><span class="erro-campo" id="vPe"></span></div>
      <div class="campo"><label>Modelo</label><button class="btn" id="vM" style="justify-content:flex-start">Escolher modelo</button></div>
      <div class="campo"><label for="vA">Ano</label><input id="vA" type="text" inputmode="numeric" maxlength="9"></div>
      <div class="campo"><label for="vK">KM atual</label><input id="vK" type="text" inputmode="numeric"></div></div>
      <div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="vS">Salvar placa</button></div>`, { aoFechar: () => { if (!feito) res(null); } });
    $('#vP', m.el).oninput = () => {
      const p = normPlaca($('#vP', m.el).value), x = D.veiPorPlaca[p];
      $('#vPe', m.el).textContent = x && x.ClienteId !== clienteId ? `Esta placa está no cadastro de ${(D.cli[x.ClienteId] || {}).Nome || 'outro cliente'}.` : '';
    };
    $('#vM', m.el).onclick = () => escolherModelo().then(mm => { if (mm) { modeloId = mm.Id; $('#vM', m.el).textContent = nomeModelo(mm); } });
    $('#vS', m.el).onclick = e => ocupado(e.currentTarget, async () => {
      const placa = normPlaca($('#vP', m.el).value);
      if (!placaValida(placa)) throw new Error('Confira a placa.');
      const v = { Placa: placa, ClienteId: clienteId, ModeloId: modeloId, Ano: $('#vA', m.el).value.trim(), KmAtual: dig($('#vK', m.el).value) };
      let j = await api('salvarVeiculo', { veiculo: v });
      if (j.erro === 'PLACA_EXISTE') {
        if (!await confirmar(`${j.msg} Passar a placa para este cliente?`, 'Passar a placa')) return;
        j = await api('salvarVeiculo', { veiculo: { ...v, transferir: true } });
      }
      if (j.erro) throw new Error(j.msg || j.erro);
      upsert('veiculos', j.veiculo); aposSalvar();
      feito = true; m.fechar(); toast('Placa salva.'); res(D.vei[j.veiculo.Id]);
    });
  });
}
function editarFichaVeiculo(v, local) {
  return new Promise(res => {
    if (!v) return res(false);
    const mod = D.mod[v.ModeloId];
    const propria = v._ficha && v._ficha.length;
    const ficha = JSON.parse(JSON.stringify(propria ? v._ficha : (mod ? mod._ficha : [])));
    let feito = false;
    const m = abrirModal('Ficha – ' + fmtPlaca(v.Placa), `<p class="suave peq">${propria ? 'Este veículo tem ficha própria.' : mod ? 'Mostrando a ficha do modelo ' + esc(nomeModelo(mod)) + '.' : 'Este veículo ainda não tem modelo escolhido.'} Óleo do motor em litros; filtros em unidades. Um item pode ter vários produtos que servem.</p><div id="fEd"></div>
      <div class="botoes" style="margin-top:1rem">${mod ? '<button class="btn btn-primario" id="fMod">Salvar no modelo (todos os veículos dele)</button>' : ''}<button class="btn btn-oleo" id="fVei">Usar só neste veículo</button>${propria ? '<button class="btn" id="fPad">Voltar à ficha do modelo</button>' : ''}</div>`, { aoFechar: () => { if (!feito) res(false); } });
    fichaEditor($('#fEd', m.el), ficha);
    const gravarVeiculo = async f => {
      v._ficha = f; v._fichaEditada = true;
      if (!local && v.Id) {
        const j = await api('salvarVeiculo', { veiculo: { ...veiculoParaEnviar(v), ClienteId: v.ClienteId } });
        if (j.erro) throw new Error(j.msg || j.erro);
        upsert('veiculos', j.veiculo); aposSalvar();
      }
      feito = true; m.fechar(); toast('Ficha salva.'); res(true);
    };
    $('#fVei', m.el).onclick = e => ocupado(e.currentTarget, () => gravarVeiculo(ficha.filter(i => i.tipo)));
    if ($('#fPad', m.el)) $('#fPad', m.el).onclick = e => ocupado(e.currentTarget, () => gravarVeiculo([]));
    if ($('#fMod', m.el)) $('#fMod', m.el).onclick = e => ocupado(e.currentTarget, async () => {
      const j = await api('salvarModelo', { modelo: { ...limparModelo(mod), Ficha: ficha }, forcar: true });
      if (j.erro) throw new Error(j.msg || j.erro);
      upsert('modelos', j.modelo); aposSalvar();
      if (propria) await gravarVeiculo([]); else { feito = true; m.fechar(); toast('Ficha do modelo salva.'); res(true); }
    });
  });
}
function limparModelo(m) { const o = { ...m }; delete o._ficha; delete o._linha; return o; }
function fichaEditor(el, f) {
  const desenhar = () => {
    el.innerHTML = (f.length ? f.map((it, i) => `<div class="veic" data-i="${i}"><div class="campos">
      <div class="campo"><label>Item</label><select data-c="tipo">${Object.entries(TIPOS_ITEM).map(([k, n]) => `<option value="${k}"${k === it.tipo ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="campo"><label>${it.tipo === 'OLEO_MOTOR' ? 'Litros' : 'Quantidade'}</label><input type="text" inputmode="decimal" data-c="qtd" value="${esc(it.qtd ?? '')}"></div>
      <div class="campo largo"><span class="rot">Produtos que servem (o primeiro é o preferido)</span><div>${(it.produtos || []).map((p, j) => `<span class="selo" style="margin:.15rem .15rem 0 0">${esc(p.codigo ? p.codigo + ' – ' : '')}${esc(p.nome)} <button class="btn-link" data-rm="${j}" aria-label="Tirar ${esc(p.nome)}">×</button></span>`).join('') || '<span class="suave peq">Nenhum produto ainda.</span>'}</div>
      <div class="botoes" style="margin-top:.4rem"><button class="btn btn-peq" data-add>+ Produto</button><button class="btn btn-peq btn-perigo" data-del>Remover item</button></div></div></div></div>`).join('') : '<p class="suave peq">Sem itens na ficha.</p>') +
      `<div class="botoes"><button class="btn btn-peq" data-novo>+ Item</button>${f.length ? '' : '<button class="btn btn-peq" data-padrao>Usar itens padrão</button>'}</div>`;
  };
  el.onchange = e => { const box = e.target.closest('[data-i]'); if (!box || !e.target.dataset.c) return; const it = f[+box.dataset.i]; it[e.target.dataset.c] = e.target.dataset.c === 'qtd' ? num(e.target.value) : e.target.value; if (e.target.dataset.c === 'tipo') desenhar(); };
  el.onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    const box = b.closest('[data-i]'), it = box ? f[+box.dataset.i] : null;
    if (b.hasAttribute('data-novo')) f.push({ tipo: 'FILTRO_OLEO', qtd: 1, produtos: [] });
    else if (b.hasAttribute('data-padrao')) f.push({ tipo: 'OLEO_MOTOR', qtd: '', produtos: [] }, { tipo: 'FILTRO_OLEO', qtd: 1, produtos: [] }, { tipo: 'FILTRO_AR', qtd: 1, produtos: [] }, { tipo: 'FILTRO_COMBUSTIVEL', qtd: 1, produtos: [] }, { tipo: 'FILTRO_CABINE', qtd: 1, produtos: [] });
    else if (b.hasAttribute('data-del')) f.splice(+box.dataset.i, 1);
    else if (b.dataset.rm !== undefined) it.produtos.splice(+b.dataset.rm, 1);
    else if (b.hasAttribute('data-add')) {
      const p = await escolherProduto({ permitirLivre: true });
      if (!p) return;
      (it.produtos = it.produtos || []).push({ codigo: String(p.Codigo || ''), nome: p.Nome });
    } else return;
    desenhar();
  };
  desenhar();
  return f;
}

/* ============ CATÁLOGO DE MODELOS ============ */
function telaModelos() {
  let tipo = '';
  V(`<div class="cab"><h1>Catálogo de veículos</h1>${pode('cadastro') ? '<button class="btn btn-oleo" id="mNovo">Novo modelo</button>' : ''}</div>
    <p class="suave peq">Cada modelo guarda a ficha de manutenção: litros de óleo do motor e os filtros que usa.</p>
    <input type="search" id="mq" placeholder="Marca, modelo ou motor" autocomplete="off">
    <div class="abas" id="mTipos" style="margin-top:.6rem"></div>
    <div class="bloco"><ul class="lista" id="mLista"></ul></div>`);
  const desenhar = () => {
    const cont = {};
    D.modelos.forEach(m => { cont[m.Tipo] = (cont[m.Tipo] || 0) + 1; });
    $('#mTipos').innerHTML = [['', 'Todos', D.modelos.length], ...TIPOS_VEIC.filter(t => cont[t]).map(t => [t, t, cont[t]])].map(([k, n, c]) => `<button data-tp="${esc(k)}" class="${k === tipo ? 'ativo' : ''}">${esc(n)} (${c})</button>`).join('');
    $$('#mTipos button').forEach(b => { b.onclick = () => { tipo = b.dataset.tp; desenhar(); }; });
    const toks = norm($('#mq').value).split(' ').filter(Boolean);
    const l = D.modelos.filter(m => (!tipo || m.Tipo === tipo) && toks.every(t => norm(nomeModelo(m) + ' ' + m.Tipo).includes(t))).sort((a, b) => nomeModelo(a).localeCompare(nomeModelo(b)));
    const nVeic = {};
    D.veiculos.forEach(v => { nVeic[v.ModeloId] = (nVeic[v.ModeloId] || 0) + 1; });
    $('#mLista').innerHTML = l.length ? l.map(m => `<li><button class="linha-btn" data-m="${esc(m.Id)}"><span class="cresce"><span class="tit">${esc(nomeModelo(m))}</span><span class="sub">${esc(m.Tipo)}${nVeic[m.Id] ? `, ${nVeic[m.Id]} veículo(s)` : ''} – ${esc(resumoFicha(m._ficha) || 'ficha não cadastrada')}</span></span></button></li>`).join('') : '<li class="vazio">Nenhum modelo encontrado.</li>';
    $$('#mLista [data-m]').forEach(b => { b.onclick = () => { if (pode('cadastro')) abrirModelo({ id: b.dataset.m, aoSalvar: () => desenhar() }); }; });
  };
  $('#mq').oninput = debounce(desenhar, 150);
  if ($('#mNovo')) $('#mNovo').onclick = () => abrirModelo({ aoSalvar: () => desenhar() });
  desenhar();
}
function abrirModelo({ id, preset = {}, aoSalvar, escolhendo } = {}) {
  const orig = id ? D.mod[id] : null;
  const m = orig ? limparModelo(orig) : { Tipo: 'Carro', Marca: '', Modelo: '', Motor: '', Anos: '', IntervaloKm: '', IntervaloDias: '', ...preset };
  const ficha = JSON.parse(JSON.stringify(orig ? orig._ficha : []));
  const md = abrirModal(orig ? 'Editar modelo' : 'Novo modelo', `<div class="campos">
      <div class="campo"><label for="mT">Tipo</label><select id="mT">${TIPOS_VEIC.map(t => `<option${t === m.Tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="campo"><label for="mMa">Marca *</label><input id="mMa" type="text" value="${esc(m.Marca)}" autocomplete="off" placeholder="Ex.: Volkswagen"></div>
      <div class="campo"><label for="mMo">Modelo *</label><input id="mMo" type="text" value="${esc(m.Modelo)}" autocomplete="off" placeholder="Ex.: Constellation 24.280"></div>
      <div class="campo"><label for="mMt">Motor/versão</label><input id="mMt" type="text" value="${esc(m.Motor)}" autocomplete="off" placeholder="Ex.: MAN D08 6.9"></div>
      <div class="campo"><label for="mAn">Anos</label><input id="mAn" type="text" value="${esc(m.Anos)}" placeholder="Ex.: 2015–2022"></div>
      <div class="campo"><label for="mIk">Trocar óleo a cada (km)</label><input id="mIk" type="text" inputmode="numeric" value="${esc(m.IntervaloKm)}" placeholder="padrão do posto"></div>
      <div class="campo"><label for="mId">Ou a cada (dias)</label><input id="mId" type="text" inputmode="numeric" value="${esc(m.IntervaloDias)}" placeholder="padrão do posto"></div>
    </div><div id="mPar"></div>
    <h3 style="margin-top:1rem">Ficha de manutenção</h3><div id="mFicha"></div>
    <div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="mS">Salvar modelo</button></div>`);
  fichaEditor($('#mFicha', md.el), ficha);
  const ler = () => ({ ...m, Id: id || '', Tipo: $('#mT', md.el).value, Marca: $('#mMa', md.el).value.trim(), Modelo: $('#mMo', md.el).value.trim(), Motor: $('#mMt', md.el).value.trim(), Anos: $('#mAn', md.el).value.trim(), IntervaloKm: dig($('#mIk', md.el).value), IntervaloDias: dig($('#mId', md.el).value) });
  const usar = x => { md.fechar(); if (aoSalvar) aoSalvar(x); };
  const par = () => {
    const p = modeloParecidos(ler(), id);
    $('#mPar', md.el).innerHTML = p.length ? `<div class="parecidos"><h3>Modelos parecidos no catálogo</h3><ul class="lista">${p.map(r => `<li><span><b>${esc(nomeModelo(r.x))}</b><br><span class="peq">${esc(r.x.Tipo)} – ${esc(resumoFicha(r.x._ficha) || 'sem ficha')}</span></span>${escolhendo ? `<button class="btn btn-peq btn-oleo" data-usar="${esc(r.x.Id)}">Usar este</button>` : ''}</li>`).join('')}</ul></div>` : '';
    $$('[data-usar]', md.el).forEach(b => { b.onclick = () => usar(D.mod[b.dataset.usar]); });
  };
  ['#mT', '#mMa', '#mMo', '#mMt'].forEach(s => $(s, md.el).addEventListener('input', debounce(par, 250)));
  par();
  $('#mS', md.el).onclick = e => ocupado(e.currentTarget, async () => {
    const dados = ler();
    if (!dados.Marca || !dados.Modelo) throw new Error('Informe a marca e o modelo.');
    let forcar = false;
    const p = modeloParecidos(dados, id).filter(r => r.s >= (id ? 0.92 : 0.85));
    if (p.length) {
      const r = await perguntar(id ? 'Modelo duplicado?' : 'Modelo parecido já cadastrado', `<p>${id ? 'Este modelo parece estar duas vezes no catálogo. Unificar passa os veículos do outro para este.' : 'Já existe modelo parecido. É o mesmo?'}</p><ul class="lista">${p.map(x => `<li style="padding:.5rem 0"><b>${esc(nomeModelo(x.x))}</b> <span class="suave peq">${esc(x.x.Tipo)}</span><div style="margin-top:.3rem"><button class="btn btn-peq btn-oleo" data-valor="${esc(x.x.Id)}">${id ? 'Unificar com este' : 'É o mesmo: usar este'}</button></div></li>`).join('')}</ul>`, [{ rotulo: 'É diferente: salvar', valor: 'SALVAR', classe: 'btn-primario' }]);
      if (r === null) return;
      if (r !== 'SALVAR') {
        if (!id) return usar(D.mod[r]);
        if (!pode('unificar')) throw new Error('Peça ao caixa ou gerente para unificar os modelos.');
        const u = await api('unificarModelos', { manterId: id, removerId: r });
        if (u.erro) throw new Error(u.erro);
        D.modelos = D.modelos.filter(x => x.Id !== u.removidoId);
        D.veiculos.forEach(v => { if (v.ModeloId === u.removidoId) v.ModeloId = id; });
        upsert('modelos', u.modelo); aposSalvar();
        toast('Modelos unificados.');
      }
      forcar = true;
    }
    const j = await api('salvarModelo', { modelo: { ...dados, Ficha: ficha.filter(i => i.tipo) }, forcar });
    if (j.erro === 'DUPLICADO') {
      if (await confirmar(`${nomeModelo(j.existente)} já está no catálogo. Usar o existente?`, 'Usar o existente')) { upsert('modelos', j.existente); aposSalvar(); return usar(D.mod[j.existente.Id]); }
      return;
    }
    if (j.erro) throw new Error(j.msg || j.erro);
    upsert('modelos', j.modelo); aposSalvar();
    toast('Modelo salvo.');
    usar(D.mod[j.modelo.Id]);
  });
}
function escolherModelo() {
  return new Promise(res => {
    let feito = false;
    const m = abrirModal('Escolher modelo', `<input type="search" id="eq" placeholder="Marca, modelo ou motor" autocomplete="off"><div id="eRes" class="resultados"></div>${pode('cadastro') ? '<div class="botoes" style="margin-top:.7rem"><button class="btn btn-oleo" id="eNovo">Cadastrar novo modelo</button></div>' : ''}`, { aoFechar: () => { if (!feito) res(null); } });
    const fim = x => { feito = true; m.fechar(); res(x); };
    const mostrar = () => {
      const q = $('#eq', m.el).value, toks = norm(q).split(' ').filter(Boolean);
      let l = D.modelos.filter(x => toks.every(t => norm(nomeModelo(x) + ' ' + x.Tipo).includes(t)));
      if (!l.length && q.length >= 3) l = D.modelos.map(x => ({ x, s: simTxt(q, nomeModelo(x)) })).filter(r => r.s >= 0.5).sort((a, b) => b.s - a.s).map(r => r.x);
      l = l.slice(0, 40);
      $('#eRes', m.el).innerHTML = l.length ? l.map(x => `<button data-id="${esc(x.Id)}"><span><b>${esc(nomeModelo(x))}</b><br><span class="suave peq">${esc(x.Tipo)} – ${esc(resumoFicha(x._ficha) || 'sem ficha')}</span></span></button>`).join('') : `<p class="vazio">${D.modelos.length ? 'Nada encontrado.' : 'Catálogo vazio. Cadastre o primeiro modelo.'}</p>`;
      $$('#eRes [data-id]', m.el).forEach(b => { b.onclick = () => fim(D.mod[b.dataset.id]); });
    };
    $('#eq', m.el).oninput = debounce(mostrar, 120);
    if ($('#eNovo', m.el)) $('#eNovo', m.el).onclick = () => {
      const q = $('#eq', m.el).value.trim().split(/\s+/);
      abrirModelo({ preset: { Marca: q.length > 1 ? q[0] : '', Modelo: q.length > 1 ? q.slice(1).join(' ') : q[0] || '' }, escolhendo: true, aoSalvar: x => { if (x) fim(x); } });
    };
    mostrar();
  });
}

/* ============ PRODUTOS ============ */
function telaProdutos() {
  const compra = pode('ver_compra'), ajusta = pode('ajustar_estoque') || pode('editar_preco');
  const F = S.filtroProd = S.filtroProd || { sit: '', grupo: '', cat: '', posto: S.posto };
  if (!S.postos.some(p => p.Codigo === F.posto)) F.posto = S.posto;
  let base = D.produtos;
  V(`<div class="cab"><h1>Produtos e estoque</h1><div class="botoes">${pode('importar') ? '<button class="btn" id="pImp">Importar</button>' : ''}<button class="btn" id="pXls">Planilha</button><button class="btn" id="pPdf">PDF</button></div></div>
    <div class="botoes" style="flex-wrap:nowrap"><input type="search" id="pq" placeholder="Código de barras, código ou nome" autocomplete="off"><button class="btn" id="pScan" aria-label="Ler código de barras pela câmera">📷</button></div>
    <div class="campos filtros" style="margin:.6rem 0">
      ${S.postos.length > 1 ? `<div class="campo"><label for="fPo">Posto</label><select id="fPo">${S.postos.map(p => `<option value="${esc(p.Codigo)}"${p.Codigo === F.posto ? ' selected' : ''}>${esc(p.Nome)}</option>`).join('')}</select></div>` : ''}
      <div class="campo"><label for="fSit">Estoque</label><select id="fSit">${[['', 'Todos'], ['com', 'Com estoque'], ['sem', 'Sem estoque (zero)'], ['neg', 'Negativos'], ['rede', 'Só da rede (não importado aqui)']].map(([k, n]) => `<option value="${k}"${k === F.sit ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="campo"><label for="fGr">Grupo</label><select id="fGr"></select></div>
      <div class="campo"><label for="fCat">Categoria</label><select id="fCat"></select></div>
    </div>
    <p class="suave peq" id="pRes"></p>
    <div class="bloco"><ul class="lista" id="pLista"></ul></div>`);
  const opcoes = (el, campo, atual) => { const v = [...new Set(base.map(p => String(p[campo] || '').trim()).filter(Boolean))].sort(); el.innerHTML = `<option value="">Todos</option>${v.map(x => `<option${x === atual ? ' selected' : ''}>${esc(x)}</option>`).join('')}`; };
  const filtrados = () => {
    const q = $('#pq').value.trim(), toks = norm(q).split(' ').filter(Boolean);
    return base.filter(p => {
      const e = num(p.Estoque);
      if (F.sit === 'com' && !(e > 0)) return false;
      if (F.sit === 'sem' && e !== 0) return false;
      if (F.sit === 'neg' && !(e < 0)) return false;
      if (F.sit === 'rede' && !p.Rede) return false;
      if (F.grupo && String(p.Grupo || '').trim() !== F.grupo) return false;
      if (F.cat && String(p.Categoria || '').trim() !== F.cat) return false;
      if (!q) return true;
      const n = p._n || norm(`${p.Nome} ${p.Codigo} ${p.Grupo || ''}`);
      return String(p.Codigo) === q || String(p.Barras || '').split(/[;,\s]+/).includes(q) || toks.every(t => n.includes(t));
    });
  };
  const mostrar = () => {
    const l = filtrados(), nomeP = (S.postos.find(p => p.Codigo === F.posto) || {}).Nome || F.posto;
    $('#pRes').textContent = `${l.length} de ${base.length} produto(s) – ${nomeP}. Saldo e preço da última importação do B2Click${ajusta ? '; toque em Ajustar para corrigir um saldo' : ''}.`;
    $('#pLista').innerHTML = l.length ? l.slice(0, 200).map((p, i) => `<li style="display:flex;justify-content:space-between;gap:.8rem;padding:.6rem .2rem"><span style="min-width:0"><b>${esc(p.Nome)}</b><br><span class="suave peq">Cód. ${esc(p.Codigo)}${p.Barras ? ' – barras ' + esc(p.Barras) : ''}${p.Grupo ? ' – ' + esc(p.Grupo) : ''}${p.Categoria ? ' – ' + esc(p.Categoria) : ''}${p.Rede ? ' – cadastro da rede, sem estoque importado aqui' : ''}</span></span><span style="text-align:right;white-space:nowrap" class="num"><b>${brl(p.PrecoVenda)}</b>${num(p.PrecoPrazo) ? `<br><span class="peq">a prazo ${brl(p.PrecoPrazo)}</span>` : ''}${compra && p.PrecoCompra !== undefined ? `<br><span class="suave peq">compra ${brl(p.PrecoCompra)}</span>` : ''}<br>${p._comb ? '<span class="peq suave">granel – sem estoque no app</span>' : `<span class="peq ${num(p.Estoque) <= 0 ? 'erro-campo' : 'suave'}">estoque ${fmtQtd(p.Estoque)} ${esc(p.Unidade || '')}</span>`}${ajusta && !p.Rede && !p._comb ? `<br><button class="btn-link peq" data-aj="${i}">Ajustar</button>` : ''}</span></li>`).join('') + (l.length > 200 ? `<li class="vazio">Mostrando 200 de ${l.length}. Use a busca ou os filtros, ou baixe a planilha.</li>` : '')
      : `<li class="vazio">${base.length ? 'Nada encontrado com esses filtros.' : 'Nenhum produto importado para este posto ainda.'}</li>`;
    $$('#pLista [data-aj]').forEach(b => { b.onclick = () => ajustarSaldo(l[+b.dataset.aj], F.posto).then(ok => { if (ok) mostrar(); }); });
  };
  const recarregar = async () => {
    if (F.posto === S.posto) base = D.produtos;
    else { $('#pRes').textContent = 'Carregando…'; const j = await api('produtosPosto', { posto: F.posto }); if (j.erro) throw new Error(j.erro); base = j.produtos; base.forEach(p => { p._n = norm(`${p.Nome} ${p.Codigo} ${p.Grupo || ''}`); }); }
    opcoes($('#fGr'), 'Grupo', F.grupo); opcoes($('#fCat'), 'Categoria', F.cat); mostrar();
  };
  $('#pq').oninput = debounce(mostrar, 140);
  $('#fSit').onchange = () => { F.sit = $('#fSit').value; mostrar(); };
  $('#fGr').onchange = () => { F.grupo = $('#fGr').value; mostrar(); };
  $('#fCat').onchange = () => { F.cat = $('#fCat').value; mostrar(); };
  if ($('#fPo')) $('#fPo').onchange = () => { F.posto = $('#fPo').value; F.grupo = F.cat = ''; recarregar().catch(e => toast(e.message, 'erro')); };
  $('#pScan').onclick = async () => { const c = await escanear(); if (c) { $('#pq').value = c; mostrar(); } };
  if ($('#pImp')) $('#pImp').onclick = () => ir('importar');
  const titulo = () => `Estoque ${(S.postos.find(p => p.Codigo === F.posto) || {}).Nome || F.posto} ${dataBR(hojeISO())}`;
  const colunas = () => [['Código', 'Codigo'], ['Barras', 'Barras'], ['Produto', 'Nome'], ['Grupo', 'Grupo'], ['Categoria', 'Categoria'], ['Unid.', 'Unidade'], ['Preço à vista', 'PrecoVenda'], ['Preço a prazo', 'PrecoPrazo']].concat(compra ? [['Preço compra', 'PrecoCompra']] : []).concat([['Estoque', 'Estoque']]);
  $('#pXls').onclick = e => ocupado(e.currentTarget, async () => {
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const cs = colunas(), l = filtrados();
    const ws = window.XLSX.utils.aoa_to_sheet([cs.map(c => c[0])].concat(l.map(p => cs.map(([, k]) => /Preco|Estoque/.test(k) ? num(p[k]) : String(p[k] ?? '')))));
    const wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
    window.XLSX.writeFile(wb, nomeArquivo(titulo()).replace(/\.pdf$/, '.xlsx'));
  });
  $('#pPdf').onclick = e => ocupado(e.currentTarget, async () => {
    const cs = colunas(), l = filtrados();
    const filtro = [F.sit && $('#fSit').selectedOptions[0].text, F.grupo && 'grupo ' + F.grupo, F.cat && 'categoria ' + F.cat].filter(Boolean).join(', ');
    const html = htmlDoc(`<table class="sem" style="border-bottom:3px solid #4A1B6D"><tr><td><h1>${esc(titulo())}</h1><span class="peq">${l.length} produto(s)${filtro ? ' – ' + esc(filtro) : ''}</span></td></tr></table>
      <table><tr>${cs.map(c => `<th${/Preço|Estoque/.test(c[0]) ? ' class="r"' : ''}>${esc(c[0])}</th>`).join('')}</tr>${l.map(p => `<tr>${cs.map(([, k]) => /Preco/.test(k) ? `<td class="r">${brl(p[k])}</td>` : k === 'Estoque' ? `<td class="r">${fmtQtd(p[k])}</td>` : `<td>${esc(p[k] ?? '')}</td>`).join('')}</tr>`).join('')}</table>`, 'A4', titulo());
    await menuImprimir(() => html, titulo());
  });
  recarregar().catch(e => toast(e.message, 'erro'));
}
async function ajustarSaldo(p, posto) {
  const lideres = listaNomes(postoAtual(posto).Lideres);
  return new Promise(res => {
    let feito = false;
    const m = abrirModal(pode('editar_preco') ? 'Preço e estoque' : 'Ajustar estoque', `<p><b>${esc(p.Nome)}</b><br><span class="suave peq">Cód. ${esc(p.Codigo)} – saldo atual ${fmtQtd(p.Estoque)} ${esc(p.Unidade || '')}</span></p>
      ${pode('editar_preco') ? `<div class="campos" style="margin-bottom:.6rem"><div class="campo"><label for="ajV">Preço à vista</label><input id="ajV" type="text" inputmode="decimal" value="${esc(String(num(p.PrecoVenda)).replace('.', ','))}"></div><div class="campo"><label for="ajP">Preço a prazo</label><input id="ajP" type="text" inputmode="decimal" value="${num(p.PrecoPrazo) ? esc(String(num(p.PrecoPrazo)).replace('.', ',')) : ''}" placeholder="igual à vista"></div></div>` : ''}
      ${pode('ajustar_estoque') ? `<div class="campos"><div class="campo"><label for="ajN">Novo saldo</label><input id="ajN" type="text" inputmode="decimal" value="${esc(String(num(p.Estoque)).replace('.', ','))}"></div>
      ${lideres.length ? `<div class="campo"><label for="ajR">Responsável *</label><select id="ajR"><option value="">Escolha…</option>${lideres.map(n => `<option>${esc(n)}</option>`).join('')}</select></div>` : ''}
      <div class="campo largo"><label for="ajM">Motivo do ajuste de estoque</label><input id="ajM" type="text" placeholder="Ex.: contagem física, avaria, perda"></div></div>
      <p class="suave peq">O ajuste de estoque fica no histórico (Baixas por cupom), com o saldo antes e depois.</p>` : ''}
      <div class="botoes"><button class="btn" id="ajC">Cancelar</button><button class="btn btn-oleo" id="ajS">Salvar ajuste</button></div>`, { aoFechar: () => { if (!feito) res(false); } });
    $('#ajC', m.el).onclick = () => m.fechar();
    $('#ajS', m.el).onclick = e => ocupado(e.currentTarget, async () => {
      const dec = v => String(v || '').replace(/\./g, '').replace(',', '.');
      if ($('#ajV', m.el)) {
        const nv = dec($('#ajV', m.el).value), np = dec($('#ajP', m.el).value);
        if (num(nv) !== num(p.PrecoVenda) || num(np) !== num(p.PrecoPrazo)) {
          const jp = await api('editarPreco', { posto, codigo: p.Codigo, vista: nv, prazo: np });
          if (jp.erro) throw new Error(jp.erro);
          p.PrecoVenda = jp.PrecoVenda; p.PrecoPrazo = jp.PrecoPrazo;
          const loc = posto === S.posto && D.prodCod[p.Codigo]; if (loc && loc !== p) { loc.PrecoVenda = jp.PrecoVenda; loc.PrecoPrazo = jp.PrecoPrazo; }
          salvarCache(); toast('Preço salvo.');
        }
      }
      if ($('#ajN', m.el) && num(dec($('#ajN', m.el).value)) !== num(p.Estoque)) {
        const resp = $('#ajR', m.el) ? $('#ajR', m.el).value : '';
        if (lideres.length && !resp) throw new Error('Escolha o responsável.');
        const j = await api('ajustarEstoque', { posto, codigo: p.Codigo, novo: dec($('#ajN', m.el).value), motivo: $('#ajM', m.el).value, responsavel: resp });
        if (j.erro) throw new Error(j.erro);
        p.Estoque = j.estoque;
        if (posto === S.posto) aplicarEstoque([{ Codigo: j.codigo, Estoque: j.estoque }]);
        toast('Estoque ajustado.');
      }
      feito = true; m.fechar(); res(true);
    });
  });
}
function escolherProduto({ titulo = 'Adicionar produto', permitirLivre = false } = {}) {
  return new Promise(res => {
    let feito = false;
    const m = abrirModal(titulo, `<div class="botoes" style="flex-wrap:nowrap"><input type="search" id="pq2" placeholder="Código de barras, código ou nome" autocomplete="off"><button class="btn" id="pS2" aria-label="Ler código de barras">📷</button></div><div id="pR2" class="resultados"></div>${permitirLivre ? '<button class="btn-link" id="pL2" style="margin-top:.5rem">Produto fora do cadastro: digitar o nome</button>' : ''}`, { aoFechar: () => { if (!feito) res(null); } });
    const fim = p => { feito = true; m.fechar(); res(p); };
    const mostrar = () => {
      const l = buscarProdutos($('#pq2', m.el).value, 40);
      $('#pR2', m.el).innerHTML = l.length ? l.map((p, i) => `<button data-i="${i}"><span><b>${esc(p.Nome)}</b><br><span class="suave peq">${esc(p.Codigo)}${p.Barras ? ' – ' + esc(p.Barras) : ''}</span></span><span class="num" style="text-align:right">${brl(p.PrecoVenda)}<br><span class="peq ${num(p.Estoque) <= 0 ? 'erro-campo' : 'suave'}">est. ${fmtQtd(p.Estoque)}</span></span></button>`).join('') : '<p class="vazio">Nada encontrado.</p>';
      $$('#pR2 [data-i]', m.el).forEach(b => { b.onclick = () => fim(l[+b.dataset.i]); });
      return l;
    };
    const inp = $('#pq2', m.el);
    inp.oninput = debounce(mostrar, 120);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const ex = produtoExato(inp.value); if (ex) return fim(ex); const l = mostrar(); if (l.length === 1) fim(l[0]); } };
    $('#pS2', m.el).onclick = async () => { const c = await escanear(); if (!c) return; const p = produtoExato(c); if (p) fim(p); else { inp.value = c; mostrar(); toast('O código ' + c + ' não está no cadastro da rede.', 'erro'); } };
    if (permitirLivre) $('#pL2', m.el).onclick = async () => { const n = await pedirTexto('Produto fora do cadastro', 'Nome do produto', inp.value); if (n) fim({ Codigo: '', Nome: n, PrecoVenda: 0, Estoque: 0, _livre: true }); };
    mostrar();
  });
}
function escanear() {
  return new Promise(res => {
    let parar = () => {}, feito = false;
    const m = abrirModal('Ler código de barras', '<div class="scan"><video id="scV" playsinline muted autoplay></video><p class="suave peq">Aponte a câmera para o código de barras. Com leitor USB ou Bluetooth, use o campo de busca.</p></div>', { aoFechar: () => { parar(); if (!feito) res(null); } });
    const fim = c => { if (feito) return; feito = true; if (navigator.vibrate) navigator.vibrate(80); m.fechar(); res(String(c).trim()); };
    const video = $('#scV', m.el);
    (async () => {
      try {
        if ('BarcodeDetector' in window) {
          const formatos = await BarcodeDetector.getSupportedFormats();
          const det = new BarcodeDetector({ formats: formatos });
          const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          video.srcObject = st;
          await video.play();
          let vivo = true;
          parar = () => { vivo = false; st.getTracks().forEach(t => t.stop()); };
          const loop = async () => { if (!vivo) return; try { const r = await det.detect(video); if (r.length) return fim(r[0].rawValue); } catch (e) {} setTimeout(loop, 200); };
          loop();
        } else {
          await carregarScript('https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js');
          const leitor = new window.ZXing.BrowserMultiFormatReader();
          parar = () => { try { leitor.reset(); } catch (e) {} };
          leitor.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, r => { if (r) fim(r.getText()); });
        }
      } catch (e) { toast('Não consegui abrir a câmera: ' + (e.message || e), 'erro'); m.fechar(); }
    })();
  });
}

/* ============ ORDENS DE SERVIÇO ============ */
function seloStatus(s) { return s === 'FECHADA' ? '<span class="selo ok">fechada</span>' : s === 'EXCLUIDA' ? '<span class="selo alerta">excluída</span>' : '<span class="selo oleo">aberta</span>'; }
function linhaOS(o) {
  return `<li><button class="linha-btn" data-osid="${esc(o.Id)}">${o.Placa ? placaHtml(o.Placa) : ''}<span class="cresce"><span class="tit">Nº ${esc(o.Numero)} – ${esc(o.ClienteNome || '')}</span><span class="sub">${dataBR(o.Data)}${o.Posto !== S.posto ? ' – ' + esc(nomePosto(o.Posto)) : ''}</span></span><span style="text-align:right"><b class="num">${brl(o.Total)}</b><br>${seloStatus(o.Status)}${o.Status === 'ABERTA' || (o.Status !== 'EXCLUIDA' && !o.CupomNumero) ? (o.LancadaEm ? ' <span class="selo ok">no B2Click</span>' : ' <span class="selo">a lançar</span>') : ''}</span></button></li>`;
}
function ligarOS(el) { $$('[data-osid]', el).forEach(b => { b.onclick = () => ir('os-form', { id: b.dataset.osid }); }); }
function presetDeBusca(q) {
  q = String(q || '').trim();
  if (!q) return {};
  if (placaValida(q)) return { placa: normPlaca(q) };
  const d = dig(q);
  if ((d.length === 11 || d.length === 14) && d.length === q.replace(/[\s.\-/]/g, '').length && docOk(d)) return { Documento: d };
  if (d.length >= 10 && /^[\d\s()+-]+$/.test(q)) return { WhatsApp: d };
  return { Nome: q };
}
async function telaOSLista() {
  let aba = S.abaOS || 'ABERTA', lista = [];
  const abas = [['ABERTA', 'Abertas'], ['HOJE', 'Hoje'], ['30', 'Últimos 30 dias']].concat(pode('os_excluir') ? [['EXCLUIDA', 'Excluídas']] : []);
  V(`<div class="cab"><h1>Ordens de serviço</h1><div class="botoes">${pode('os_fechar') ? '<button class="btn" id="oCup">Cupom fiscal</button>' : ''}<button class="btn btn-oleo" id="oNova">Nova O.S.</button></div></div>
    <div class="abas" id="oAbas">${abas.map(([k, n]) => `<button data-a="${k}" class="${k === aba ? 'ativo' : ''}">${n}</button>`).join('')}</div>
    <input type="search" id="oq" placeholder="Filtrar por placa, cliente ou número" autocomplete="off">
    <div class="bloco" style="margin-top:.8rem"><ul class="lista" id="oLista"><li class="vazio">Carregando…</li></ul></div>`);
  const filtrar = () => {
    const q = norm($('#oq').value), qp = normPlaca($('#oq').value);
    const l = lista.filter(o => !q || norm(o.ClienteNome + ' ' + o.Numero).includes(q) || (qp.length >= 3 && o.Placa.includes(qp)));
    $('#oLista').innerHTML = l.length ? l.map(linhaOS).join('') : '<li class="vazio">Nenhuma O.S. aqui.</li>';
    ligarOS($('#oLista'));
  };
  const carregar = async () => {
    $('#oLista').innerHTML = '<li class="vazio">Carregando…</li>';
    const h = hojeISO();
    const p = aba === 'ABERTA' ? { status: 'ABERTA' } : aba === 'HOJE' ? { de: h, ate: h } : aba === '30' ? { de: somaDiasISO(h, -30) } : { status: 'EXCLUIDA' };
    const j = await api('listarOS', p);
    if (j.erro) throw new Error(j.erro);
    lista = j.lista;
    if ($('#oLista')) filtrar();
  };
  $$('#oAbas button').forEach(b => { b.onclick = () => { aba = S.abaOS = b.dataset.a; $$('#oAbas button').forEach(x => x.classList.toggle('ativo', x === b)); carregar().catch(e => toast(e.message, 'erro')); }; });
  $('#oNova').onclick = () => { S.osAtual = null; ir('os-form', {}); };
  if ($('#oCup')) $('#oCup').onclick = () => ir('cupom', {});
  $('#oq').oninput = debounce(filtrar, 120);
  await carregar();
}
function prepararOS(o) {
  o.TrocaOleo = o.TrocaOleo === true || o.TrocaOleo === 'SIM';
  o.Itens = (o.Itens || []).map(i => ({ ...i, alternativas: i.alternativas || [] }));
  o.Desconto = num(o.Desconto);
  return o;
}
const osEditavel = o => o.Status !== 'EXCLUIDA' && (o.Status !== 'FECHADA' || pode('os_fechar'));
async function telaOSForm(arg = {}) {
  if (arg.rascunho && S.osAtual) { desenharOS(); return; }
  if (arg.id) {
    V('<p class="vazio">Carregando O.S.…</p>');
    const j = await api('obterOS', { id: arg.id });
    if (j.erro) throw new Error(j.erro);
    S.osAtual = prepararOS(j.os);
    const v = D.vei[S.osAtual.VeiculoId], f = fichaDoVeiculo(v);
    S.osAtual.Itens.forEach(i => { const fi = f.find(x => x.tipo === i.tipo); if (fi) i.alternativas = alternativasDe(fi); });
  } else {
    S.osAtual = prepararOS({ Id: '', Posto: S.posto, Numero: '', Status: 'NOVA', Data: hojeISO(), ClienteId: '', ClienteNome: '', VeiculoId: '', Placa: '', Km: '', TrocaOleo: 'SIM', Itens: [], Desconto: 0, Obs: '' });
    if (arg.clienteId && D.cli[arg.clienteId]) escolherClienteOS(D.cli[arg.clienteId]);
    if (arg.veiculoId && D.vei[arg.veiculoId]) selecionarVeiculoOS(arg.veiculoId);
  }
  S.osSujo = false;
  desenharOS();
}
function escolherClienteOS(c) {
  const o = S.osAtual;
  if (o.ClienteId !== c.Id) { o.VeiculoId = ''; o.Placa = ''; }
  o.ClienteId = c.Id; o.ClienteNome = c.Nome;
  const vs = D.veiPorCli[c.Id] || [];
  if (vs.length === 1 && !o.VeiculoId) selecionarVeiculoOS(vs[0].Id);
  S.osSujo = true;
}
function selecionarVeiculoOS(id) {
  const o = S.osAtual, v = D.vei[id];
  if (!v) return;
  o.VeiculoId = v.Id; o.Placa = v.Placa;
  if (!o.Itens.length) puxarFicha(true);
  S.osSujo = true;
}
function alternativasDe(fi) {
  return (fi.produtos || []).map(p => { const x = D.prodCod[p.codigo]; return { codigo: p.codigo, nome: x ? x.Nome : p.nome, preco: x ? precoDe(x) : 0, estoque: x ? num(x.Estoque) : 0, existe: !!x }; });
}
function puxarFicha(silencioso) {
  const o = S.osAtual, v = D.vei[o.VeiculoId], f = fichaDoVeiculo(v);
  if (!f.length) { if (!silencioso) toast('Este veículo ainda não tem ficha. Cadastre em Clientes › Ficha ou no catálogo de veículos.', 'erro'); return; }
  let n = 0;
  f.forEach(fi => {
    if (o.Itens.some(i => i.tipo === fi.tipo)) return;
    const alts = alternativasDe(fi);
    const qtd = num(fi.qtd) || 1;
    const esc1 = alts.find(a => a.existe && a.estoque >= qtd) || alts.find(a => a.existe) || alts[0];
    o.Itens.push(esc1 ? { codigo: esc1.codigo, nome: esc1.nome, tipo: fi.tipo, qtd, preco: esc1.preco, alternativas: alts } : { codigo: '', nome: TIPOS_ITEM[fi.tipo] + ' (escolher produto)', tipo: fi.tipo, qtd, preco: 0, alternativas: [] });
    n++;
  });
  S.osSujo = true;
  if (!silencioso) toast(n ? `${n} item(ns) da ficha adicionados.` : 'Os itens da ficha já estão na O.S.');
}
const semEstoqueBloqueado = () => postoAtual(S.osAtual && S.osAtual.Posto).VenderSemEstoque === 'NAO' && !(S.osAtual && S.osAtual.CupomNumero);
function faltaEstoque(itens) {
  const soma = {};
  itens.forEach(i => { if (i.codigo && D.prodCod[i.codigo] && !D.prodCod[i.codigo]._comb) soma[i.codigo] = (soma[i.codigo] || 0) + num(i.qtd); });
  return Object.keys(soma).filter(k => soma[k] > num(D.prodCod[k].Estoque) + 0.0005).map(k => `${D.prodCod[k].Nome} (estoque ${fmtQtd(D.prodCod[k].Estoque)})`);
}
function adicionarItemOS(p) {
  const o = S.osAtual;
  const ex = p.Codigo && o.Itens.find(i => i.codigo === String(p.Codigo));
  if (semEstoqueBloqueado() && !p._livre && !p._comb && p.Codigo && D.prodCod[p.Codigo]) {
    const quero = (ex ? num(ex.qtd) : 0) + 1;
    if (num(p.Estoque) < quero) { toast(`${p.Nome}: sem estoque (saldo ${fmtQtd(p.Estoque)}). Este posto não vende sem estoque.`, 'erro'); return; }
  }
  if (ex) ex.qtd = num(ex.qtd) + 1;
  else {
    const tipo = adivinharTipo(p.Nome + ' ' + (p.Grupo || ''));
    const fi = fichaDoVeiculo(D.vei[o.VeiculoId]).find(x => x.tipo === tipo);
    o.Itens.push({ codigo: String(p.Codigo || ''), nome: p.Nome, tipo, qtd: fi && num(fi.qtd) ? num(fi.qtd) : 1, preco: precoDe(p), alternativas: fi ? alternativasDe(fi) : [] });
  }
  S.osSujo = true;
  desenharItensOS();
  toast('Adicionado: ' + p.Nome);
}
function desenharOS() {
  const o = S.osAtual, ed = osEditavel(o), c = D.cli[o.ClienteId], vs = o.ClienteId ? (D.veiPorCli[o.ClienteId] || []) : [];
  const v = D.vei[o.VeiculoId], m = v ? D.mod[v.ModeloId] : null, podePreco = pode('os_fechar');
  V(`<div class="cab"><div><h1>${o.Id ? 'O.S. nº ' + esc(o.Numero) : 'Nova O.S.'}</h1><span class="suave peq">${esc(nomePosto(o.Posto))}${o.CupomNumero ? ' – cupom fiscal nº ' + esc(o.CupomNumero) : ''}${o.CriadoPor ? ' – aberta por ' + esc(o.CriadoPor) : ''}${o.FechadoPor ? ', fechada por ' + esc(o.FechadoPor) + (o.CaixaNome ? ' (caixa ' + esc(o.CaixaNome) + ')' : '') : ''}</span></div>${o.Id ? seloStatus(o.Status) : ''}</div>
    ${o.Status === 'EXCLUIDA' ? `<div class="parecidos"><b>O.S. excluída</b> em ${dataBR(o.ExcluidoEm)} por ${esc(o.ExcluidoPor)}. Motivo: ${esc(o.MotivoExclusao)}</div>` : ''}
    <div class="bloco"><h2>Cliente e veículo</h2>
      <div class="campo"><span class="rot">Cliente</span>${ed ? `<button class="btn" id="osCli" style="justify-content:flex-start">${c ? esc(c.Nome) : o.ClienteNome ? esc(o.ClienteNome) : 'Escolher cliente'}</button>` : `<b>${esc(o.ClienteNome)}</b>`}</div>
      ${o.ClienteId ? `<div class="campo" style="margin-top:.7rem"><span class="rot">Placa</span><div class="botoes">${vs.map(x => `<button class="btn btn-peq ${x.Id === o.VeiculoId ? 'btn-oleo' : ''}" data-vei="${esc(x.Id)}" aria-pressed="${x.Id === o.VeiculoId}" ${ed ? '' : 'disabled'}>${esc(fmtPlaca(x.Placa))}</button>`).join('')}${o.Placa && !vs.some(x => x.Id === o.VeiculoId) ? `<span class="selo">${esc(fmtPlaca(o.Placa))}</span>` : ''}${ed && pode('cadastro') ? '<button class="btn btn-peq" id="osPlaca">+ Placa</button>' : ''}</div>
        ${v ? `<p class="suave peq" style="margin:.4rem 0 0">${esc(nomeModelo(m) || 'Modelo não informado')}${num(v.KmAtual) ? ' – último KM ' + fmtKm(v.KmAtual) : ''}${v.ProximaData ? ' – troca prevista ' + dataBR(v.ProximaData) : ''}</p>` : ''}</div>` : ''}
      <div class="campos" style="margin-top:.7rem">
        <div class="campo"><label for="osKm">KM no painel</label><input id="osKm" type="text" inputmode="numeric" value="${esc(o.Km)}" ${ed ? '' : 'disabled'}></div>
        <div class="campo"><label for="osData">Data</label><input id="osData" type="date" value="${esc(o.Data)}" ${ed ? '' : 'disabled'}></div>
        <label class="check campo largo"><input type="checkbox" id="osTroca" ${o.TrocaOleo ? 'checked' : ''} ${ed ? '' : 'disabled'}><span>Troca de óleo do motor (calcula a próxima troca e o lembrete)</span></label>
      </div></div>
    <div class="bloco"><div class="cab"><h2>Itens</h2>${ed && v ? '<button class="btn btn-peq" id="osFicha">Puxar ficha</button>' : ''}</div>
      ${ed ? `<div class="botoes" style="flex-wrap:nowrap"><input type="search" id="osBusca" placeholder="Código de barras, código ou nome" autocomplete="off"><button class="btn" id="osScan" aria-label="Ler código de barras">📷</button></div><div id="osRes"></div><button class="btn-link" id="osAvulso">+ Serviço ou item avulso</button>` : ''}
      <div id="osItens"></div>
      <div class="botoes" style="margin:.6rem 0 0;align-items:center"><span class="rot" style="margin:0">Pagamento</span>${[['VISTA', 'À vista'], ['PRAZO', 'A prazo']].map(([k, n]) => `<button class="btn btn-peq ${(o.Pagamento || 'VISTA') === k ? 'btn-oleo' : ''}" data-pag="${k}" ${ed ? '' : 'disabled'}>${n}</button>`).join('')}</div>
      <div class="totais"><span class="suave">Subtotal <span class="num" id="osSub"></span></span>${podePreco && ed ? `<label class="suave">Desconto R$ <input id="osDesc" type="text" inputmode="decimal" value="${o.Desconto ? esc(String(o.Desconto).replace('.', ',')) : ''}" style="width:7rem;min-height:2.3rem"></label>` : o.Desconto ? `<span class="suave">Desconto <span class="num">${brl(o.Desconto)}</span></span>` : ''}<span>Total <span class="total num" id="osTot"></span></span></div></div>
    <div class="bloco"><div class="campo"><label for="osObs">Observação</label><textarea id="osObs" ${ed ? '' : 'disabled'}>${esc(o.Obs)}</textarea></div></div>
    <div id="osB2"></div>
    <div class="barra-acoes" id="osAcoes"></div>`);
  desenharItensOS();
  desenharAcoesOS();
  desenharLancarB2();
  if (!ed) return;
  const sujo = () => { S.osSujo = true; };
  $('#osKm').oninput = () => { o.Km = dig($('#osKm').value); sujo(); };
  $('#osData').onchange = () => { o.Data = $('#osData').value; sujo(); };
  $('#osTroca').onchange = () => { o.TrocaOleo = $('#osTroca').checked; sujo(); };
  $('#osObs').oninput = () => { o.Obs = $('#osObs').value; sujo(); };
  $$('[data-pag]').forEach(b => { b.onclick = () => {
    if ((o.Pagamento || 'VISTA') === b.dataset.pag) return;
    o.Pagamento = b.dataset.pag;
    o.Itens.forEach(it => { const x = D.prodCod[it.codigo]; if (x) it.preco = precoDe(x, o.Pagamento); (it.alternativas || []).forEach(a => { const y = D.prodCod[a.codigo]; if (y) a.preco = precoDe(y, o.Pagamento); }); });
    S.osSujo = true; desenharOS(); toast(o.Pagamento === 'PRAZO' ? 'Preços a prazo aplicados.' : 'Preços à vista aplicados.');
  }; });
  if ($('#osDesc')) $('#osDesc').oninput = () => { o.Desconto = num($('#osDesc').value); sujo(); atualizarTotais(); };
  $('#osCli').onclick = async () => {
    const r = await escolherCliente();
    if (!r) return;
    if (r.novo) {
      if (PILHA.length) PILHA[PILHA.length - 1].arg = { rascunho: true };
      ir('cliente-form', { preset: presetDeBusca(r.q), aoSalvar: cl => { escolherClienteOS(D.cli[cl.Id] || cl); voltar(); } });
      return;
    }
    escolherClienteOS(r.c);
    if (r.v) selecionarVeiculoOS(r.v.Id);
    desenharOS();
  };
  $$('[data-vei]').forEach(b => { b.onclick = () => { selecionarVeiculoOS(b.dataset.vei); desenharOS(); }; });
  if ($('#osPlaca')) $('#osPlaca').onclick = () => veiculoRapido(o.ClienteId).then(nv => { if (nv) { selecionarVeiculoOS(nv.Id); desenharOS(); } });
  if ($('#osFicha')) $('#osFicha').onclick = () => { puxarFicha(false); desenharItensOS(); };
  const busca = $('#osBusca');
  const mostrar = () => {
    const q = busca.value.trim();
    if (q.length < 2) { $('#osRes').innerHTML = ''; return []; }
    const l = buscarProdutos(q, 12);
    $('#osRes').innerHTML = l.length ? `<div class="resultados">${l.map((p, i) => `<button data-i="${i}"><span><b>${esc(p.Nome)}</b><br><span class="suave peq">${esc(p.Codigo)}</span></span><span class="num" style="text-align:right">${brl(p.PrecoVenda)}<br><span class="peq ${num(p.Estoque) <= 0 ? 'erro-campo' : 'suave'}">est. ${fmtQtd(p.Estoque)}</span></span></button>`).join('')}</div>` : '<p class="suave peq">Nada encontrado no cadastro da rede.</p>';
    $$('#osRes [data-i]').forEach(b => { b.onclick = () => { adicionarItemOS(l[+b.dataset.i]); busca.value = ''; $('#osRes').innerHTML = ''; busca.focus(); }; });
    return l;
  };
  busca.oninput = debounce(mostrar, 120);
  busca.onkeydown = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const ex = produtoExato(busca.value);
    const l = ex ? [ex] : mostrar();
    if (l.length === 1) { adicionarItemOS(l[0]); busca.value = ''; $('#osRes').innerHTML = ''; }
  };
  $('#osScan').onclick = async () => { const cod = await escanear(); if (!cod) return; const p = produtoExato(cod); if (p) adicionarItemOS(p); else { busca.value = cod; mostrar(); toast('O código ' + cod + ' não está no cadastro deste posto.', 'erro'); } };
  $('#osAvulso').onclick = () => {
    const md = abrirModal('Serviço ou item avulso', `<div class="campos"><div class="campo largo"><label for="avN">Descrição</label><input id="avN" type="text" placeholder="Ex.: Mão de obra – troca de óleo"></div><div class="campo"><label for="avT">Tipo</label><select id="avT">${Object.entries(TIPOS_ITEM).map(([k, n]) => `<option value="${k}"${k === 'SERVICO' ? ' selected' : ''}>${n}</option>`).join('')}</select></div><div class="campo"><label for="avQ">Quantidade</label><input id="avQ" type="text" inputmode="decimal" value="1"></div><div class="campo"><label for="avV">Valor unitário (R$)</label><input id="avV" type="text" inputmode="decimal" ${pode('os_fechar') ? '' : 'disabled placeholder="o caixa define o valor"'}></div></div><div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="avOk">Adicionar</button></div>`);
    $('#avOk', md.el).onclick = () => {
      const n = $('#avN', md.el).value.trim();
      if (!n) return toast('Escreva a descrição.', 'erro');
      o.Itens.push({ codigo: '', nome: n, tipo: $('#avT', md.el).value, qtd: num($('#avQ', md.el).value) || 1, preco: num($('#avV', md.el).value), alternativas: [] });
      S.osSujo = true; md.fechar(); desenharItensOS();
    };
  };
}
function desenharItensOS() {
  const o = S.osAtual, ed = osEditavel(o), podePreco = pode('os_fechar'), el = $('#osItens');
  if (!el) return;
  el.innerHTML = o.Itens.length ? o.Itens.map((it, i) => {
    const p = D.prodCod[it.codigo];
    const falta = p && !p._comb && num(p.Estoque) < num(it.qtd);
    const bloq = falta && semEstoqueBloqueado();
    return `<div class="veic" data-i="${i}"${bloq ? ' style="border-color:var(--alerta)"' : ''}><div style="display:flex;justify-content:space-between;gap:.5rem"><div style="min-width:0"><b>${esc(it.nome)}</b><br><span class="suave peq">${esc(TIPOS_ITEM[it.tipo] || '')}${it.codigo ? ' – cód. ' + esc(it.codigo) : ''}</span>${falta ? `<br><span class="erro-campo">${semEstoqueBloqueado() ? 'Sem saldo suficiente: ' : 'Estoque no sistema: '}${fmtQtd(p.Estoque)}</span>` : ''}</div>${ed ? `<button class="btn-link" data-rm aria-label="Remover ${esc(it.nome)}" style="font-size:1.5rem;line-height:1">×</button>` : ''}</div>
      ${ed && it.alternativas && it.alternativas.length > 1 ? `<select data-alt style="margin-top:.4rem" aria-label="Trocar produto">${it.alternativas.map(a => `<option value="${esc(a.codigo)}"${a.codigo === it.codigo ? ' selected' : ''}>${esc(a.nome)}${a.existe ? ' – ' + brl(a.preco) + ' (est. ' + fmtQtd(a.estoque) + ')' : ' – fora do cadastro'}</option>`).join('')}</select>` : ''}
      <div class="botoes" style="align-items:center;margin-top:.4rem"><label class="peq">Qtd <input data-q type="text" inputmode="decimal" value="${esc(String(it.qtd).replace('.', ','))}" style="width:5rem;min-height:2.3rem" ${ed ? '' : 'disabled'}></label>
      <label class="peq">Preço ${ed && podePreco ? `<input data-p type="text" inputmode="decimal" value="${esc(num(it.preco).toFixed(2).replace('.', ','))}" style="width:6.5rem;min-height:2.3rem">` : `<b class="num">${brl(it.preco)}</b>`}</label>
      <b class="num" style="margin-left:auto" data-tot>${brl(num(it.qtd) * num(it.preco))}</b></div></div>`;
  }).join('') : '<p class="suave peq" style="margin:.8rem 0">Nenhum item. Busque o produto acima ou puxe a ficha do veículo.</p>';
  $$('[data-i]', el).forEach(box => {
    const it = o.Itens[+box.dataset.i];
    const tot = () => { $('[data-tot]', box).textContent = brl(num(it.qtd) * num(it.preco)); atualizarTotais(); S.osSujo = true; };
    const rm = $('[data-rm]', box); if (rm) rm.onclick = () => { o.Itens.splice(+box.dataset.i, 1); S.osSujo = true; desenharItensOS(); };
    const q = $('[data-q]', box); if (q) q.oninput = () => { it.qtd = num(q.value); tot(); };
    const pr = $('[data-p]', box); if (pr) pr.oninput = () => { it.preco = num(pr.value); tot(); };
    const al = $('[data-alt]', box); if (al) al.onchange = () => { const a = it.alternativas.find(x => x.codigo === al.value); if (a) { it.codigo = a.codigo; it.nome = a.nome; it.preco = a.preco; S.osSujo = true; desenharItensOS(); } };
  });
  atualizarTotais();
}
function atualizarTotais() {
  const o = S.osAtual;
  const sub = o.Itens.reduce((s, i) => s + arred(num(i.qtd) * num(i.preco)), 0);
  o.Subtotal = arred(sub); o.Total = arred(sub - num(o.Desconto));
  if ($('#osSub')) { $('#osSub').textContent = brl(o.Subtotal); $('#osTot').textContent = brl(o.Total); }
}
/* ============ LANÇAR NO B2CLICK (caixa) ============ */
async function copiarTexto(t) {
  t = String(t ?? '');
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
  toast('Copiado: ' + (t.length > 40 ? t.slice(0, 40) + '…' : t));
}
function desenharLancarB2() {
  const el = $('#osB2'); if (!el) return;
  const o = S.osAtual;
  if (!o.Id || o.Status === 'EXCLUIDA' || !pode('os_fechar')) { el.innerHTML = ''; return; }
  const c = D.cli[o.ClienteId] || {};
  const doc = dig(c.Documento);
  const ref = ['PLACA ' + normPlaca(o.Placa), 'OS ' + o.Numero, num(o.Km) ? 'KM ' + dig(o.Km) : ''].filter(x => !/^PLACA $/.test(x) && x).join(' ');
  const linhas = [
    ['Placa', normPlaca(o.Placa)], ['KM', num(o.Km) ? dig(o.Km) : ''], ['Cód. cliente B2Click', c.Codigo || ''],
    ['Nome', c.Nome || o.ClienteNome || ''], [doc.length === 14 ? 'CNPJ' : 'CPF', doc], ['Obs. da O.S.', o.Obs || ''],
    ['Texto para a observação do cupom', ref]
  ];
  const ln = ([r, v], i) => `<div class="b2-linha"><span class="rot">${esc(r)}</span><span class="b2-val">${v ? esc(v) : '<span class="suave">—</span>'}</span>${v ? `<button class="btn btn-peq" data-cp="${i}">Copiar</button>` : '<span></span>'}</div>`;
  const itens = (o.Itens || []).filter(i => i.codigo || i.nome);
  el.innerHTML = `<div class="bloco b2"><div class="cab"><h2>Lançar no B2Click</h2>${o.LancadaEm ? '<span class="selo ok">lançada</span>' : '<span class="selo">a lançar</span>'}</div>
    <p class="suave peq" style="margin-top:0">Toque em Copiar e cole no B2Click. ${o.Id && S.osSujo ? '<b>Salve a O.S. antes, para copiar os dados atualizados.</b>' : ''}</p>
    ${linhas.map(ln).join('')}
    ${itens.length ? `<h3 style="margin:.8rem 0 .3rem">Produtos</h3>${itens.map((i, k) => `<div class="b2-linha"><span class="rot">${esc(i.nome)}</span><span class="b2-val num">${i.codigo ? 'cód. ' + esc(i.codigo) : 'sem código'} · qtd ${fmtQtd(i.qtd)}</span>${i.codigo ? `<span class="botoes" style="flex-wrap:nowrap"><button class="btn btn-peq" data-ci="${k}">Cód.</button><button class="btn btn-peq" data-cq="${k}">Qtd</button></span>` : '<span></span>'}</div>`).join('')}` : ''}
    <div class="botoes" style="margin-top:.8rem">${o.LancadaEm
      ? `<span class="suave peq" style="align-self:center">Lançada no B2Click por ${esc(o.LancadaPor)} em ${dataBR(o.LancadaEm)} ${esc(String(o.LancadaEm).slice(11, 16))}.</span><button class="btn btn-peq" id="b2Des">Desmarcar</button>`
      : '<button class="btn btn-oleo" id="b2Marca">Marcar como lançada no B2Click</button>'}</div></div>`;
  $$('[data-cp]', el).forEach(b => { b.onclick = () => copiarTexto(linhas[+b.dataset.cp][1]); });
  $$('[data-ci]', el).forEach(b => { b.onclick = () => copiarTexto(itens[+b.dataset.ci].codigo); });
  $$('[data-cq]', el).forEach(b => { b.onclick = () => copiarTexto(String(num(itens[+b.dataset.cq].qtd)).replace('.', ',')); });
  const marcar = desfazer => async e => ocupado(e.currentTarget, async () => {
    if (!desfazer && !await garantirSalva()) return;
    if (desfazer && !await confirmar('Desmarcar: a O.S. volta para "a lançar".', 'Desmarcar')) return;
    const j = await api('marcarLancada', { id: S.osAtual.Id, desfazer: !!desfazer });
    if (j.erro) throw new Error(j.erro);
    S.osAtual.LancadaEm = j.os.LancadaEm; S.osAtual.LancadaPor = j.os.LancadaPor;
    toast(desfazer ? 'O.S. voltou para "a lançar".' : 'O.S. marcada como lançada no B2Click.');
    desenharLancarB2();
  });
  if ($('#b2Marca', el)) $('#b2Marca', el).onclick = marcar(false);
  if ($('#b2Des', el)) $('#b2Des', el).onclick = marcar(true);
}
function desenharAcoesOS() {
  const o = S.osAtual, ed = osEditavel(o), b = [];
  if (ed) b.push('<button class="btn" id="aSalvar">Salvar</button>');
  if (ed && pode('os_fechar') && o.Status !== 'FECHADA') b.push('<button class="btn btn-oleo" id="aFechar">Fechar O.S.</button>');
  if (o.Status !== 'EXCLUIDA') {
    if (pode('imprimir')) b.push('<button class="btn" id="aImp">Imprimir</button>');
    if (pode('enviar')) b.push('<button class="btn" id="aMail">E-mail</button><button class="btn" id="aWpp">WhatsApp</button>');
  }
  if (o.Id && o.Status !== 'EXCLUIDA' && pode('os_fechar') && !o.CupomNumero) b.push('<button class="btn" id="aCup">Cupom fiscal</button>');
  if (o.Id && o.Status !== 'EXCLUIDA' && pode('os_excluir')) b.push('<button class="btn btn-perigo" id="aExc">Excluir</button>');
  $('#osAcoes').innerHTML = b.join('');
  const on = (id, fn) => { const x = $('#' + id); if (x) x.onclick = e => ocupado(e.currentTarget, fn); };
  on('aSalvar', () => salvarOS(false));
  on('aCup', async () => { if (!await garantirSalva()) return; ir('cupom', { osNumero: S.osAtual.Numero }); });
  on('aFechar', () => salvarOS(true));
  on('aImp', async () => { if (!await garantirSalva()) return; await menuImprimir(fmt => docOS(S.osAtual, fmt), 'O.S. ' + S.osAtual.Numero); });
  on('aMail', async () => { if (!await garantirSalva()) return; await enviarOSEmail(); });
  on('aWpp', async () => { if (!await garantirSalva()) return; enviarOSWhats(); });
  on('aExc', async () => {
    const mot = await pedirTexto('Excluir O.S. nº ' + o.Numero, 'Motivo da exclusão (fica registrado)', '', 'text', true);
    if (!mot) return;
    const j = await api('excluirOS', { id: o.Id, motivo: mot });
    if (j.erro) throw new Error(j.erro);
    Object.assign(o, prepararOS(j.os));
    aplicarEstoque(j.estoque);
    S.osSujo = false;
    toast(j.estoque && j.estoque.length ? 'O.S. excluída e estoque devolvido.' : 'O.S. excluída.');
    desenharOS();
  });
}
async function garantirSalva() {
  const o = S.osAtual;
  if (o.Id && !S.osSujo) return true;
  if (!osEditavel(o)) return true;
  return salvarOS(false);
}
/* Baixa da O.S.: qual caixa fechou (login de caixa compartilhado) e o nº do cupom emitido no B2Click. */
function dadosBaixa(o) {
  const caixas = listaNomes(postoAtual(o.Posto).Caixas);
  return new Promise(res => {
    let feito = false;
    const m = abrirModal(o.Numero ? 'Fechar O.S. nº ' + o.Numero : 'Fechar O.S.', `<div class="campos">
      <div class="campo largo"><label for="bxCx">Caixa que está fechando${caixas.length ? ' *' : ''}</label>${caixas.length
        ? `<select id="bxCx"><option value="">Escolha…</option>${caixas.map(c => `<option${c === o.CaixaNome ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>`
        : `<input id="bxCx" type="text" value="${esc(o.CaixaNome || S.user.nome || '')}"><span class="suave peq">Cadastre os nomes dos caixas em Configurações › Dados do posto para virar lista.</span>`}</div>
      <div class="campo largo"><label for="bxCp">Nº do cupom fiscal baixado no B2Click</label><input id="bxCp" type="text" inputmode="numeric" value="${esc(o.CupomNumero || '')}" ${o.CupomChave ? 'disabled' : ''}>
      <span class="suave peq">Com o nº do cupom, os produtos saem do estoque do posto. Sem cupom, a O.S. fecha sem mexer no estoque.</span></div></div>
      <div class="botoes" style="margin-top:1rem"><button class="btn" id="bxNao">Cancelar</button><button class="btn btn-oleo" id="bxOk">Fechar O.S.</button></div>`, { aoFechar: () => { if (!feito) res(null); } });
    $('#bxNao', m.el).onclick = () => m.fechar();
    $('#bxOk', m.el).onclick = () => {
      const caixa = $('#bxCx', m.el).value.trim(), cupom = dig($('#bxCp', m.el).value);
      if (caixas.length && !caixa) return toast('Escolha o caixa.', 'erro');
      feito = true; m.fechar(); res({ caixa, cupom });
    };
  });
}
async function salvarOS(fechar) {
  const o = S.osAtual;
  if (!o.ClienteId) throw new Error('Escolha o cliente.');
  o.Itens = o.Itens.filter(i => num(i.qtd) > 0 && i.nome);
  if (fechar) {
    if (!o.Itens.length) throw new Error('Adicione pelo menos um item.');
    if (semEstoqueBloqueado()) { const f = faltaEstoque(o.Itens); if (f.length) throw new Error('Este posto não vende sem estoque. Sem saldo: ' + f.join('; ') + '.'); }
    if (o.TrocaOleo && !o.VeiculoId) throw new Error('Escolha a placa para registrar a troca.');
    if (o.Itens.some(i => !num(i.preco)) && !await confirmar('Há item com preço zero. Fechar assim mesmo?', 'Fechar assim')) return false;
    if (o.TrocaOleo && !num(o.Km) && !await confirmar('O KM não foi informado. Fechar assim? O próximo lembrete fica só pela data.', 'Fechar sem KM')) return false;
  }
  if (fechar && o.Status !== 'FECHADA') {
    const r = await dadosBaixa(o);
    if (!r) return false;
    o.CaixaNome = r.caixa;
    if (r.cupom && !o.CupomChave) o.CupomNumero = r.cupom;
  }
  const envio = { ...o, Itens: o.Itens.map(i => ({ codigo: i.codigo, nome: i.nome, tipo: i.tipo, qtd: num(i.qtd), preco: num(i.preco) })) };
  const j = await api('salvarOS', { os: envio, fechar });
  if (j.erro) throw new Error(j.erro);
  const alts = {};
  o.Itens.forEach(i => { alts[i.tipo + '|' + i.codigo] = i.alternativas; });
  Object.assign(o, prepararOS(j.os));
  o.Itens.forEach(i => { i.alternativas = alts[i.tipo + '|' + i.codigo] || []; });
  if (j.veiculo) { upsert('veiculos', j.veiculo); aposSalvar(); }
  aplicarEstoque(j.estoque);
  S.osSujo = false;
  if (PILHA.length) PILHA[PILHA.length - 1].arg = { id: o.Id };
  toast(fechar ? 'O.S. fechada.' : 'O.S. salva.');
  desenharOS();
  if (fechar && o.TrocaOleo) sugerirFicha();
  return true;
}
async function sugerirFicha() {
  const o = S.osAtual, v = D.vei[o.VeiculoId];
  if (!v || fichaDoVeiculo(v).length || !pode('cadastro')) return;
  const f = [];
  o.Itens.filter(i => !['SERVICO', 'OUTRO'].includes(i.tipo)).forEach(i => {
    let x = f.find(y => y.tipo === i.tipo);
    if (!x) { x = { tipo: i.tipo, qtd: num(i.qtd), produtos: [] }; f.push(x); }
    if (!x.produtos.some(p => p.codigo === i.codigo && p.nome === i.nome)) x.produtos.push({ codigo: i.codigo, nome: i.nome });
  });
  if (!f.length) return;
  const m = D.mod[v.ModeloId];
  const r = await perguntar('Guardar a ficha?', `<p>Este veículo ainda não tem ficha. Guardar os produtos desta O.S. (${esc(resumoFicha(f))}) como ficha ${m ? 'do modelo ' + esc(nomeModelo(m)) + ' (vale para todos os veículos dele)' : 'deste veículo'}?</p>`, [{ rotulo: 'Agora não', valor: null }, { rotulo: 'Guardar ficha', valor: 'S', classe: 'btn-oleo' }]);
  if (!r) return;
  await ocupado(null, async () => {
    if (m) { const j = await api('salvarModelo', { modelo: { ...limparModelo(m), Ficha: f }, forcar: true }); if (j.erro) throw new Error(j.msg || j.erro); upsert('modelos', j.modelo); }
    else { const j = await api('salvarVeiculo', { veiculo: { ...veiculoParaEnviar({ ...v, _ficha: f, _fichaEditada: true }), ClienteId: v.ClienteId } }); if (j.erro) throw new Error(j.msg || j.erro); upsert('veiculos', j.veiculo); }
    aposSalvar();
    toast('Ficha guardada.');
  });
}
function escolherCliente() {
  return new Promise(res => {
    let feito = false;
    const m = abrirModal('Escolher cliente', `<input type="search" id="ecq" placeholder="Placa, nome, CPF/CNPJ ou telefone" autocomplete="off"><div id="ecR" class="resultados"></div>${pode('cadastro') ? '<div class="botoes" style="margin-top:.7rem"><button class="btn btn-oleo" id="ecN">Cadastrar novo cliente</button></div>' : ''}`, { aoFechar: () => { if (!feito) res(null); } });
    const fim = x => { feito = true; m.fechar(); res(x); };
    const mostrar = () => {
      const q = $('#ecq', m.el).value.trim();
      if (q.length < 2) { $('#ecR', m.el).innerHTML = '<p class="vazio">Digite pelo menos 2 letras ou números.</p>'; return; }
      const { vs, cs } = buscarTudo(q, 20);
      const itens = vs.map(v => ({ c: D.cli[v.ClienteId], v })).filter(x => x.c).concat(cs.map(c => ({ c })));
      $('#ecR', m.el).innerHTML = itens.length ? itens.map((x, i) => `<button data-i="${i}"><span><b>${esc(x.c.Nome)}</b><br><span class="suave peq">${x.v ? esc(fmtPlaca(x.v.Placa)) + ' – ' : ''}${esc(docMascarado(x.c.Documento) || fmtFone(x.c.WhatsApp || x.c.Fone))}</span></span></button>`).join('') : '<p class="vazio">Nada encontrado.</p>';
      $$('#ecR [data-i]', m.el).forEach(b => { b.onclick = () => fim(itens[+b.dataset.i]); });
    };
    $('#ecq', m.el).oninput = debounce(mostrar, 120);
    if ($('#ecN', m.el)) $('#ecN', m.el).onclick = () => fim({ novo: true, q: $('#ecq', m.el).value.trim() });
    mostrar();
  });
}

/* ============ IMPRESSÃO E ENVIO ============ */
const CSS_80 = '@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0}body{width:80mm;padding:3mm 4mm 6mm;font:12px/1.35 Arial,Helvetica,sans-serif;color:#000}h1{font-size:15px;margin:0;text-align:center}.c{text-align:center}.r{text-align:right}p{margin:2px 0}hr{border:0;border-top:1px dashed #000;margin:6px 0}table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:1px 0}.g{font-size:16px;font-weight:bold}.peq{font-size:10px}';
const CSS_A4 = '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font:12px/1.45 Arial,Helvetica,sans-serif;color:#111}h1{font-size:20px;margin:0}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #FFC20E;padding-bottom:3px}table{width:100%;border-collapse:collapse}th,td{padding:5px 6px;border-bottom:1px solid #ccc;text-align:left;vertical-align:top}th{background:#f1f1ee;font-size:11px}.r{text-align:right}.sem td{border:0}.g{font-size:16px;font-weight:bold}.peq{font-size:10px;color:#555}';
const idPosto80 = p => [p.CNPJ && dig(p.CNPJ) ? 'CNPJ ' + fmtDoc(p.CNPJ) : '', p.Endereco || ''].filter(Boolean).map(t => `<p class="c peq">${esc(t)}</p>`).join('');
const idPostoA4 = p => [p.CNPJ && dig(p.CNPJ) ? 'CNPJ ' + fmtDoc(p.CNPJ) : '', p.Endereco || ''].filter(Boolean).map(esc).join('<br>');
function htmlDoc(corpo, fmt, titulo) { return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${fmt === '80mm' ? CSS_80 : CSS_A4}</style></head><body>${corpo}</body></html>`; }
function docOS(o, fmt) {
  const p = { ...postoAtual(o.Posto), Nome: nomePosto(o.Posto) }, c = D.cli[o.ClienteId] || { Nome: o.ClienteNome }, v = D.vei[o.VeiculoId], m = v ? D.mod[v.ModeloId] : null;
  const cupom = (o.CupomNumero ? 'Cupom fiscal nº ' + o.CupomNumero : '') + (o.Pagamento === 'PRAZO' ? (o.CupomNumero ? ' – ' : '') + 'Pagamento a prazo' : '');
  const st = o.Status === 'FECHADA' ? '' : o.Status === 'EXCLUIDA' ? 'EXCLUÍDA' : 'EM ABERTO';
  const prox = v && v.ProximaData && o.TrocaOleo && o.Status === 'FECHADA' && v.UltimaTrocaData === o.Data ? `Próxima troca: ${dataBR(v.ProximaData)}${num(v.ProximaKm) ? ' ou ' + fmtKm(v.ProximaKm) : ''}, o que vier primeiro.` : '';
  const tit = 'O.S. nº ' + o.Numero;
  if (fmt === '80mm') {
    return htmlDoc(`<h1>${esc(p.Nome)}</h1>${idPosto80(p)}<p class="c">ORDEM DE SERVIÇO Nº ${esc(o.Numero)}</p><p class="c">${dataBR(o.Data)}${st ? ' – ' + st : ''}</p>${cupom ? `<p class="c">${esc(cupom)}</p>` : ''}<hr>
      <p><b>Cliente:</b> ${esc(c.Nome)}</p>${o.Placa ? `<p><b>Placa:</b> ${esc(fmtPlaca(o.Placa))}${m ? ' – ' + esc(nomeModelo(m)) : ''}</p>` : ''}${num(o.Km) ? `<p><b>KM:</b> ${fmtKm(o.Km)}</p>` : ''}<hr>
      <table>${o.Itens.map(i => `<tr><td colspan="2">${esc(i.nome)}</td></tr><tr><td class="peq">${fmtQtd(i.qtd)} x ${brl(i.preco)}</td><td class="r">${brl(num(i.qtd) * num(i.preco))}</td></tr>`).join('')}</table><hr>
      <table><tr><td>Subtotal</td><td class="r">${brl(o.Subtotal)}</td></tr>${num(o.Desconto) ? `<tr><td>Desconto</td><td class="r">-${brl(o.Desconto)}</td></tr>` : ''}<tr><td class="g">TOTAL</td><td class="r g">${brl(o.Total)}</td></tr></table>
      ${prox ? `<hr><p class="c"><b>${esc(prox)}</b></p>` : ''}${o.Obs ? `<hr><p>${esc(o.Obs)}</p>` : ''}<hr><p class="c">Obrigado pela preferência!</p><p class="c peq">Documento sem valor fiscal.</p>`, fmt, tit);
  }
  return htmlDoc(`<table class="sem" style="border-bottom:3px solid #4A1B6D"><tr><td><h1>${esc(p.Nome)}</h1><span class="peq">${idPostoA4(p) || 'Troca de óleo'}</span></td><td class="r"><span class="g">O.S. nº ${esc(o.Numero)}</span><br>${dataBR(o.Data)}${cupom ? '<br>' + esc(cupom) : ''}${st ? '<br><b>' + st + '</b>' : ''}</td></tr></table>
    <h2>Cliente</h2><table><tr><td><b>${esc(c.Nome)}</b>${c.Fantasia ? '<br>' + esc(c.Fantasia) : ''}</td><td>${c.Documento ? (dig(c.Documento).length === 14 ? 'CNPJ ' : 'CPF ') + esc(fmtDoc(c.Documento)) : ''}</td><td>${esc(fmtFone(c.WhatsApp || c.Fone))}${c.Email ? '<br>' + esc(c.Email) : ''}</td></tr></table>
    <h2>Veículo</h2><table><tr><td>Placa <b>${esc(fmtPlaca(o.Placa))}</b></td><td>${esc(nomeModelo(m))}${m ? ' – ' + esc(m.Tipo) : ''}</td><td>KM ${num(o.Km) ? fmtKm(o.Km) : 'não informado'}</td></tr></table>
    <h2>Itens</h2><table><tr><th>Código</th><th>Descrição</th><th class="r">Qtd</th><th class="r">Preço</th><th class="r">Total</th></tr>
    ${o.Itens.map(i => `<tr><td>${esc(i.codigo)}</td><td>${esc(i.nome)}</td><td class="r">${fmtQtd(i.qtd)}</td><td class="r">${brl(i.preco)}</td><td class="r">${brl(num(i.qtd) * num(i.preco))}</td></tr>`).join('')}
    <tr><td colspan="4" class="r">Subtotal</td><td class="r">${brl(o.Subtotal)}</td></tr>${num(o.Desconto) ? `<tr><td colspan="4" class="r">Desconto</td><td class="r">-${brl(o.Desconto)}</td></tr>` : ''}<tr><td colspan="4" class="r g">Total</td><td class="r g">${brl(o.Total)}</td></tr></table>
    ${prox ? `<p class="g" style="margin-top:14px">${esc(prox)}</p>` : ''}${o.Obs ? `<h2>Observação</h2><p>${esc(o.Obs)}</p>` : ''}
    <table class="sem" style="margin-top:56px"><tr><td style="width:50%;padding-right:24px"><div style="border-top:1px solid #000;text-align:center;padding-top:4px">Responsável pelo serviço</div></td><td><div style="border-top:1px solid #000;text-align:center;padding-top:4px">Cliente</div></td></tr></table>
    <p class="peq" style="margin-top:20px">Documento sem valor fiscal.</p>`, fmt, tit);
}
function medirAltura(html) {
  return new Promise(res => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:302px;height:200px;border:0';
    let feito = false;
    f.srcdoc = html;
    f.onload = () => setTimeout(() => {
      if (feito || !f.contentDocument) return;
      feito = true;
      const h = f.contentDocument.documentElement.scrollHeight;
      f.remove();
      res(Math.ceil(h * 25.4 / 96) + 8);
    }, 120);
    document.body.appendChild(f);
  });
}
function nomeArquivo(t) { return (String(t || 'documento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'documento') + '.pdf'; }
async function gerarPdfAparelho(html, titulo) {
  const nome = nomeArquivo(titulo);
  const j = await api('gerarPdf', { html, nome });
  if (j.erro) throw new Error(j.erro);
  const bin = atob(j.base64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const arq = new File([u8], nome, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [arq] })) {
    try { await navigator.share({ files: [arq], title: titulo }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(arq), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast('PDF baixado: ' + nome);
}
async function imprimirDoc(html, fmt, onde, titulo, agente = '') {
  if (onde === 'pdf') return gerarPdfAparelho(html, titulo);
  if (onde === 'aqui') {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    let feito = false;
    f.srcdoc = html;
    f.onload = () => setTimeout(() => {
      if (feito || !f.contentWindow) return;
      feito = true;
      f.contentWindow.focus(); f.contentWindow.print();
      setTimeout(() => f.remove(), 60000);
    }, 150);
    document.body.appendChild(f);
    return;
  }
  let final = html, alt = 0;
  if (fmt === '80mm') { alt = await medirAltura(html); final = html.replace('size:80mm auto', `size:80mm ${alt}mm`); }
  const j = await api('imprimir', { destino: fmt, html: final, alturaMm: alt, titulo, agente });
  if (j.erro) throw new Error(j.erro);
  S.agente = j.agente;
  const lig = ((j.agente && j.agente.agentes) || []).filter(a => a.online && a.destinos.includes(fmt));
  const ok = agente ? lig.some(a => a.nome === agente) : lig.length > 0;
  if (ok) toast(`Enviado para ${agente || 'a impressora do balcão'}.`);
  else toast(`Ficou na fila: ${agente ? 'o agente ' + agente + ' está' : 'nenhum agente com ' + fmt + ' está'} desligado. Sai assim que ligar.`, 'erro');
}
/* Destinos de impressão do posto: cada agente × formato, o próprio aparelho e PDF. */
function opcoesImpressao(posto) {
  const ag = (S.agente && S.agente.agentes) || [], ops = [];
  ag.forEach(a => ['80mm', 'A4'].filter(f => a.destinos.includes(f)).forEach(f => ops.push({ onde: 'agente', agente: a.nome, fmt: f, online: a.online, rot: `${a.nome} – ${f === '80mm' ? 'cupom 80 mm' : 'A4'}` })));
  if (!ag.length) ['80mm', 'A4'].forEach(f => ops.push({ onde: 'agente', agente: '', fmt: f, online: false, rot: `Balcão – ${f === '80mm' ? 'cupom 80 mm' : 'A4'}` }));
  ops.push({ onde: 'aqui', agente: '', fmt: '80mm', online: true, rot: 'Neste aparelho – 80 mm' }, { onde: 'aqui', agente: '', fmt: 'A4', online: true, rot: 'Neste aparelho – A4' }, { onde: 'pdf', agente: '', fmt: 'A4', online: true, rot: 'Gerar PDF para enviar' });
  return ops;
}
function impressaoPadrao(posto) {
  const p = postoAtual(posto), fmt = p.ImpressoraPadrao || '80mm', v = String(p.ImpressaoPadrao || '');
  if (v === 'aqui') return { onde: 'aqui', agente: '', fmt };
  if (v === 'pdf') return { onde: 'pdf', agente: '', fmt: 'A4' };
  return { onde: 'agente', agente: v.startsWith('agente:') ? v.slice(7) : '', fmt };
}
async function menuImprimir(gerar, titulo) {
  const ops = opcoesImpressao(), pad = impressaoPadrao();
  const ePad = o => o.onde === pad.onde && o.fmt === pad.fmt && (o.onde !== 'agente' || o.agente === pad.agente || (!pad.agente && ops.filter(x => x.onde === 'agente' && x.fmt === pad.fmt).indexOf(o) === 0));
  const btn = (o, i) => `<button class="btn ${ePad(o) ? 'btn-oleo' : ''}" data-valor="${i}" style="justify-content:flex-start">${o.onde === 'agente' ? `<span class="status-agente ${o.online ? 'on' : 'off'}" style="margin:0"></span>` : o.onde === 'pdf' ? '📄 ' : '📱 '}${esc(o.rot)}${o.onde === 'agente' && !o.online ? ' <span class="suave peq">(desligado)</span>' : ''}${ePad(o) ? ' <span class="peq">– padrão</span>' : ''}</button>`;
  const grupo = (t, l) => l.length ? `<h3 style="margin:.6rem 0 .3rem">${t}</h3><div class="botoes" style="flex-direction:column;align-items:stretch">${l.map(o => btn(o, ops.indexOf(o))).join('')}</div>` : '';
  const v = await perguntar('Imprimir', grupo('Agentes impressores', ops.filter(o => o.onde === 'agente')) + grupo('Neste aparelho', ops.filter(o => o.onde !== 'agente')), []);
  if (v === null || v === undefined || v === false) return;
  const o = ops[+v];
  if (!o) return;
  await imprimirDoc(gerar(o.fmt), o.fmt, o.onde, titulo, o.agente);
}
async function enviarOSEmail() {
  const o = S.osAtual, c = D.cli[o.ClienteId] || {}, p = { ...postoAtual(o.Posto), Nome: nomePosto(o.Posto) };
  const para = await pedirTexto('Enviar O.S. por e-mail', 'E-mail do cliente', c.Email || '', 'email');
  if (!para) return;
  const j = await api('enviarEmail', {
    para, assunto: `O.S. nº ${o.Numero} – ${p.Nome}`, nomeArquivo: `OS-${o.Id}.pdf`, html: docOS(o, 'A4'),
    texto: `Olá, ${primeiroNome(c.Nome || o.ClienteNome)}!\n\nSegue em anexo a ordem de serviço nº ${o.Numero} do veículo ${fmtPlaca(o.Placa)}.\nTotal: ${brl(o.Total)}.\n\nObrigado pela preferência!\n${p.Nome}`
  });
  if (j.erro) throw new Error(j.erro);
  toast('E-mail enviado.');
}
function enviarOSWhats() {
  const o = S.osAtual, c = D.cli[o.ClienteId] || {}, p = { ...postoAtual(o.Posto), Nome: nomePosto(o.Posto) };
  const num1 = c.WhatsApp || c.Fone;
  if (!num1) throw new Error('Este cliente não tem WhatsApp cadastrado.');
  const v = D.vei[o.VeiculoId];
  let txt = preencher(p.MsgOS || MSG_PADRAO.os, { nome: primeiroNome(c.Nome || o.ClienteNome), os: o.Numero, placa: fmtPlaca(o.Placa), total: brl(o.Total), posto: p.Nome });
  txt += '\n\n' + o.Itens.map(i => `• ${i.nome} – ${fmtQtd(i.qtd)} x ${brl(i.preco)}`).join('\n');
  if (v && v.ProximaData && o.Status === 'FECHADA' && o.TrocaOleo) txt += `\n\nPróxima troca: ${dataBR(v.ProximaData)}${num(v.ProximaKm) ? ' ou ' + fmtKm(v.ProximaKm) : ''}.`;
  window.open(waLink(num1, txt), '_blank', 'noopener');
}

/* ============ EXTRATO ============ */
const kpi = (rot, val) => `<div class="kpi"><b class="num">${val}</b><span>${esc(rot)}</span></div>`;
function tabela(cab, linhas) {
  if (!linhas.length) return '<p class="suave peq">Sem dados.</p>';
  return `<div class="rolar"><table class="tab"><thead><tr>${cab.map((c, i) => `<th class="${i ? 'r' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map((c, i) => `<td class="${i ? 'r num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function telaExtrato(arg = {}) {
  const f = { tipo: 'cliente', clienteId: arg.clienteId || '', placa: '', codigo: '', produtoNome: '', de: somaDiasISO(hojeISO(), -90), ate: hojeISO(), posto: S.postos.length > 1 ? 'TODOS' : S.posto };
  let ultimo = null;
  const descricao = () => f.tipo === 'cliente' ? 'Cliente: ' + ((D.cli[f.clienteId] || {}).Nome || '') : f.tipo === 'placa' ? 'Placa: ' + fmtPlaca(f.placa) : 'Produto: ' + f.produtoNome;
  const docExtrato = (r, fmt) => {
    const per = `${dataBR(f.de)} a ${dataBR(f.ate)}`, pn = f.posto === 'TODOS' ? S.geral.MARCA_NOME : nomePosto(f.posto);
    if (fmt === '80mm') return htmlDoc(`<h1>EXTRATO DE CONSUMO</h1><p class="c">${esc(pn)}</p><p class="c">${per}</p><p>${esc(descricao())}</p><hr>${r.pedidos.map(p => `<p><b>Nº ${esc(p.numero)} – ${dataBR(p.data)} – ${esc(fmtPlaca(p.placa))}</b></p><table>${p.itens.map(i => `<tr><td>${esc(i.nome)} (${fmtQtd(i.qtd)})</td><td class="r">${brl(i.total)}</td></tr>`).join('')}</table>`).join('<hr>')}<hr><table><tr><td class="g">TOTAL</td><td class="r g">${brl(r.total)}</td></tr></table>`, fmt, 'Extrato');
    return htmlDoc(`<table class="sem" style="border-bottom:3px solid #4A1B6D"><tr><td><h1>Extrato de consumo</h1><span class="peq">${esc(pn)}</span></td><td class="r">${per}<br><b>${esc(descricao())}</b></td></tr></table>
      <h2>Por produto</h2><table><tr><th>Produto</th><th class="r">Vezes</th><th class="r">Qtd</th><th class="r">Valor</th></tr>${r.produtos.map(p => `<tr><td>${esc(p.nome)}</td><td class="r">${p.vezes}</td><td class="r">${fmtQtd(p.qtd)}</td><td class="r">${brl(p.total)}</td></tr>`).join('')}</table>
      <h2>Por pedido (O.S.)</h2><table><tr><th>Nº</th><th>Data</th><th>Placa</th><th>Cliente</th><th>Itens</th><th class="r">Total</th></tr>${r.pedidos.map(p => `<tr><td>${esc(p.numero)}</td><td>${dataBR(p.data)}</td><td>${esc(fmtPlaca(p.placa))}</td><td>${esc(p.clienteNome)}</td><td>${p.itens.map(i => esc(i.nome) + ' (' + fmtQtd(i.qtd) + ')').join('<br>')}</td><td class="r">${brl(p.total)}</td></tr>`).join('')}<tr><td colspan="5" class="r g">Total</td><td class="r g">${brl(r.total)}</td></tr></table>`, fmt, 'Extrato de consumo');
  };
  const desenhar = () => {
    const c = D.cli[f.clienteId];
    V(`<div class="cab"><h1>Extrato de consumo</h1></div><div class="bloco"><div class="abas" id="eTipos">${[['cliente', 'Por cliente'], ['placa', 'Por placa'], ['produto', 'Por produto']].map(([k, n]) => `<button data-t="${k}" class="${k === f.tipo ? 'ativo' : ''}">${n}</button>`).join('')}</div>
      <div class="campos">
        ${f.tipo === 'cliente' ? `<div class="campo largo"><span class="rot">Cliente</span><button class="btn" id="eCli" style="justify-content:flex-start">${c ? esc(c.Nome) : 'Escolher cliente'}</button></div>` : ''}
        ${f.tipo === 'placa' ? `<div class="campo"><label for="ePl">Placa</label><input id="ePl" type="text" autocapitalize="characters" maxlength="8" value="${esc(fmtPlaca(f.placa))}"></div>` : ''}
        ${f.tipo === 'produto' ? `<div class="campo largo"><span class="rot">Produto</span><button class="btn" id="ePr" style="justify-content:flex-start">${f.codigo ? esc(f.produtoNome) : 'Escolher produto'}</button></div>` : ''}
        <div class="campo"><label for="eDe">De</label><input id="eDe" type="date" value="${f.de}"></div>
        <div class="campo"><label for="eAte">Até</label><input id="eAte" type="date" value="${f.ate}"></div>
        ${S.postos.length > 1 ? `<div class="campo"><label for="ePo">Posto</label><select id="ePo"><option value="TODOS">Todos os meus postos</option>${S.postos.map(p => `<option value="${esc(p.Codigo)}"${p.Codigo === f.posto ? ' selected' : ''}>${esc(p.Nome)}</option>`).join('')}</select></div>` : ''}
      </div><div class="botoes" style="margin-top:.8rem"><button class="btn btn-oleo" id="eGo">Gerar extrato</button></div></div><div id="eRes"></div>`);
    $$('#eTipos button').forEach(b => { b.onclick = () => { f.tipo = b.dataset.t; desenhar(); }; });
    if ($('#eCli')) $('#eCli').onclick = async () => { const r = await escolherCliente(); if (r && r.c) { f.clienteId = r.c.Id; desenhar(); } };
    if ($('#ePr')) $('#ePr').onclick = async () => { const p = await escolherProduto({ titulo: 'Escolher produto' }); if (p) { f.codigo = String(p.Codigo); f.produtoNome = p.Nome; desenhar(); } };
    $('#eGo').onclick = e => ocupado(e.currentTarget, async () => {
      f.de = $('#eDe').value; f.ate = $('#eAte').value;
      if ($('#ePo')) f.posto = $('#ePo').value;
      if ($('#ePl')) f.placa = normPlaca($('#ePl').value);
      const p = { posto: f.posto, de: f.de, ate: f.ate };
      if (f.tipo === 'cliente') { if (!f.clienteId) throw new Error('Escolha o cliente.'); p.clienteId = f.clienteId; }
      if (f.tipo === 'placa') { if (!placaValida(f.placa)) throw new Error('Confira a placa.'); p.placa = f.placa; }
      if (f.tipo === 'produto') { if (!f.codigo) throw new Error('Escolha o produto.'); p.codigo = f.codigo; }
      const r = await api('extrato', p);
      if (r.erro) throw new Error(r.erro);
      ultimo = r;
      $('#eRes').innerHTML = `<div class="bloco"><div class="cab"><h2>Resultado</h2><div class="botoes">${pode('imprimir') ? '<button class="btn btn-peq" id="eImp">Imprimir</button>' : ''}${f.tipo === 'cliente' && pode('enviar') ? '<button class="btn btn-peq" id="eMail">Enviar por e-mail</button>' : ''}</div></div>
        <div class="kpis">${kpi('Pedidos (O.S.)', r.pedidos.length)}${kpi('Total', brl(r.total))}</div>
        <h3>Por produto</h3>${tabela(['Produto', 'Vezes', 'Qtd', 'Valor'], r.produtos.map(x => [x.nome, x.vezes, fmtQtd(x.qtd), brl(x.total)]))}
        <h3 style="margin-top:1rem">Por pedido</h3>${r.pedidos.length ? `<ul class="lista">${r.pedidos.map(x => `<li style="padding:.5rem 0"><details><summary style="cursor:pointer">Nº ${esc(x.numero)} – ${dataBR(x.data)} – ${esc(fmtPlaca(x.placa))}${f.tipo !== 'cliente' ? ' – ' + esc(x.clienteNome) : ''} – <b>${brl(x.total)}</b></summary>${tabela(['Item', 'Qtd', 'Valor'], x.itens.map(i => [i.nome, fmtQtd(i.qtd), brl(i.total)]))}</details></li>`).join('')}</ul>` : '<p class="suave peq">Nenhuma O.S. fechada no período.</p>'}</div>`;
      if ($('#eImp')) $('#eImp').onclick = e2 => ocupado(e2.currentTarget, () => menuImprimir(fmt => docExtrato(ultimo, fmt), 'Extrato'));
      if ($('#eMail')) $('#eMail').onclick = e2 => ocupado(e2.currentTarget, async () => {
        const c = D.cli[f.clienteId] || {};
        const para = await pedirTexto('Enviar extrato', 'E-mail do cliente', c.Email || '', 'email');
        if (!para) return;
        const pn = f.posto === 'TODOS' ? S.geral.MARCA_NOME : nomePosto(f.posto);
        const j = await api('enviarEmail', { para, assunto: `Extrato de consumo – ${pn}`, nomeArquivo: 'extrato.pdf', html: docExtrato(ultimo, 'A4'), texto: `Olá, ${primeiroNome(c.Nome)}!\n\nSegue em anexo o extrato de consumo de ${dataBR(f.de)} a ${dataBR(f.ate)}.\n\n${pn}` });
        if (j.erro) throw new Error(j.erro);
        toast('Extrato enviado.');
      });
    });
  };
  desenhar();
}

/* ============ LEMBRETES E PÓS-VENDA ============ */
async function telaLembretes() {
  let aba = S.abaLem || 'TROCA', lista = [], carregadoConcl = null;
  const nomes = { TROCA: 'troca', ANIVERSARIO: 'aniversário', POSVENDA: 'pós-venda' };
  V(`<div class="cab"><h1>Lembretes e pós-venda</h1><button class="btn btn-peq" id="lGerar">Gerar agora</button></div>
    <p class="suave peq">Gerados todo dia às 7h só para clientes que autorizaram mensagens. O e-mail sai sozinho; o WhatsApp abre com o texto pronto para você tocar em Enviar.</p>
    <div class="abas" id="lAbas"></div><div id="lLista"><p class="vazio">Carregando…</p></div>`);
  const cartao = l => `<li style="padding:.8rem 0" data-l="${esc(l.Id)}"><div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">${l.Placa ? placaHtml(l.Placa) : ''}<b>${esc(l.ClienteNome)}</b><span class="selo ${l.Tipo === 'TROCA' ? 'oleo' : ''}">${nomes[l.Tipo] || l.Tipo}</span>${l.Tipo === 'TROCA' ? `<span class="suave peq">prevista ${dataBR(l.DataRef)}</span>` : ''}</div>
    <p class="peq" style="margin:.4rem 0">${esc(l.Mensagem)}</p>
    <p class="suave peq" style="margin:0 0 .4rem">E-mail: ${esc(l.EmailStatus === 'ENVIADO' ? 'enviado' : l.EmailStatus === 'SEM_EMAIL' ? 'sem e-mail' : (l.EmailStatus || '–'))}. WhatsApp: ${l.WhatsStatus === 'ENVIADO' ? 'enviado' : l.WhatsStatus === 'SEM_NUMERO' ? 'sem número' : 'pendente'}.${l.Status === 'CONCLUIDO' ? ` Resultado: ${esc(l.Resultado || 'concluído')}${l.Nota ? ', nota ' + esc(l.Nota) : ''}${l.Obs ? ' – ' + esc(l.Obs) : ''}.` : ''}</p>
    <div class="botoes">${l.WhatsApp && l.Status !== 'CONCLUIDO' ? '<button class="btn btn-peq btn-oleo" data-w>WhatsApp</button>' : ''}${l.WhatsApp ? `<a class="btn btn-peq" href="tel:${dig(l.WhatsApp)}">Ligar</a>` : ''}${l.Status !== 'CONCLUIDO' ? '<button class="btn btn-peq" data-c>Concluir</button>' : ''}${D.cli[l.ClienteId] ? '<button class="btn btn-peq" data-cl>Cliente</button>' : ''}</div></li>`;
  const desenhar = () => {
    const conc = aba === 'CONCLUIDO';
    $('#lAbas').innerHTML = [['TROCA', 'Trocas'], ['ANIVERSARIO', 'Aniversários'], ['POSVENDA', 'Pós-venda'], ['CONCLUIDO', 'Concluídos']].map(([k, n]) => `<button data-a="${k}" class="${k === aba ? 'ativo' : ''}">${n}${k !== 'CONCLUIDO' ? ` (${lista.filter(l => l.Tipo === k).length})` : ''}</button>`).join('');
    $$('#lAbas button').forEach(b => { b.onclick = () => { aba = S.abaLem = b.dataset.a; desenhar(); }; });
    if (conc && !carregadoConcl) {
      $('#lLista').innerHTML = '<p class="vazio">Carregando…</p>';
      api('lembretes', { status: 'CONCLUIDO' }).then(j => { carregadoConcl = j.lista || []; if (aba === 'CONCLUIDO') desenhar(); }).catch(e => toast(e.message, 'erro'));
      return;
    }
    const l = conc ? carregadoConcl : lista.filter(x => x.Tipo === aba);
    $('#lLista').innerHTML = l.length ? `<div class="bloco"><ul class="lista">${l.map(cartao).join('')}</ul></div>` : '<p class="vazio">Nada pendente aqui.</p>';
    $$('#lLista [data-l]').forEach(li => {
      const x = l.find(y => y.Id === li.dataset.l);
      const w = $('[data-w]', li);
      if (w) w.onclick = () => {
        window.open(waLink(x.WhatsApp, x.Mensagem), '_blank', 'noopener');
        x.WhatsStatus = 'ENVIADO';
        api('atualizarLembrete', { id: x.Id, WhatsStatus: 'ENVIADO' }).catch(() => {});
        setTimeout(desenhar, 400);
      };
      const cl = $('[data-cl]', li);
      if (cl) cl.onclick = () => ir('cliente', x.ClienteId);
      const c = $('[data-c]', li);
      if (c) c.onclick = () => concluir(x);
    });
  };
  const concluir = x => {
    const ops = x.Tipo === 'TROCA' ? ['Agendou', 'Vai passar no posto', 'Já trocou em outro lugar', 'Não quer agora', 'Não atendeu'] : x.Tipo === 'POSVENDA' ? ['Satisfeito', 'Insatisfeito – tratar', 'Não respondeu'] : ['Mensagem enviada', 'Não enviada'];
    const m = abrirModal('Concluir lembrete', `<p><b>${esc(x.ClienteNome)}</b></p><div class="campo"><label for="cRes">Resultado</label><select id="cRes">${ops.map(o => `<option>${o}</option>`).join('')}</select></div>
      ${x.Tipo === 'POSVENDA' ? `<p class="rot" style="margin-top:.8rem">Nota do cliente</p><div class="botoes" id="cNota">${[1, 2, 3, 4, 5].map(n => `<button class="btn" data-n="${n}" aria-pressed="false">${n}</button>`).join('')}</div>` : ''}
      <div class="campo" style="margin-top:.8rem"><label for="cObs">Observação</label><textarea id="cObs"></textarea></div><div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="cOk">Concluir</button></div>`);
    let nota = '';
    $$('#cNota [data-n]', m.el).forEach(b => { b.onclick = () => { nota = b.dataset.n; $$('#cNota [data-n]', m.el).forEach(y => { y.classList.toggle('btn-oleo', y === b); y.setAttribute('aria-pressed', y === b); }); }; });
    $('#cOk', m.el).onclick = e => ocupado(e.currentTarget, async () => {
      const j = await api('atualizarLembrete', { id: x.Id, Status: 'CONCLUIDO', Resultado: $('#cRes', m.el).value, Nota: nota, Obs: $('#cObs', m.el).value.trim() });
      if (j.erro) throw new Error(j.erro);
      lista = lista.filter(y => y.Id !== x.Id);
      carregadoConcl = null;
      m.fechar(); toast('Lembrete concluído.'); desenhar();
    });
  };
  const carregar = async () => { const j = await api('lembretes', { status: 'PENDENTE' }); if (j.erro) throw new Error(j.erro); lista = j.lista; if ($('#lLista')) desenhar(); };
  $('#lGerar').onclick = e => ocupado(e.currentTarget, async () => { const j = await api('gerarLembretes', {}); if (j.erro) throw new Error(j.erro); toast(j.novos ? `${j.novos} lembrete(s) novo(s).` : 'Nenhum lembrete novo hoje.'); await carregar(); });
  await carregar();
}

/* ============ PAINEL (DASHBOARD) ============ */
async function telaDashboard() {
  let per = S.perDash || 'mes', postoSel = S.posto;
  const h = hojeISO();
  V(`<div class="cab"><h1>Painel</h1></div>
    <div class="bloco"><div class="campos">
      <div class="campo"><label for="dPer">Período</label><select id="dPer">${[['hoje', 'Hoje'], ['7', 'Últimos 7 dias'], ['mes', 'Este mês'], ['mesant', 'Mês passado'], ['per', 'Escolher datas']].map(([k, n]) => `<option value="${k}"${k === per ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="campo ${per === 'per' ? '' : 'oculto'}" id="dDatas"><label for="dDe">De / até</label><div class="botoes" style="flex-wrap:nowrap"><input id="dDe" type="date" value="${h.slice(0, 8)}01"><input id="dAte" type="date" value="${h}"></div></div>
      ${S.postos.length > 1 ? `<div class="campo"><label for="dPo">Posto</label><select id="dPo"><option value="TODOS">Todos os meus postos</option>${S.postos.map(p => `<option value="${esc(p.Codigo)}"${p.Codigo === postoSel ? ' selected' : ''}>${esc(p.Nome)}</option>`).join('')}</select></div>` : ''}
    </div><div class="botoes" style="margin-top:.8rem"><button class="btn btn-oleo" id="dGo">Atualizar painel</button></div></div><div id="dRes"></div>`);
  const periodo = () => {
    if (per === 'hoje') return [h, h];
    if (per === '7') return [somaDiasISO(h, -6), h];
    if (per === 'mes') return [h.slice(0, 8) + '01', h];
    if (per === 'mesant') { const ini1 = h.slice(0, 8) + '01', fim = somaDiasISO(ini1, -1); return [fim.slice(0, 8) + '01', fim]; }
    return [$('#dDe').value, $('#dAte').value];
  };
  $('#dPer').onchange = () => { per = S.perDash = $('#dPer').value; $('#dDatas').classList.toggle('oculto', per !== 'per'); };
  const carregar = async () => {
    if ($('#dPo')) postoSel = $('#dPo').value;
    const [de, ate] = periodo();
    $('#dRes').innerHTML = '<p class="vazio">Calculando…</p>';
    const j = await api('dashboard', { posto: postoSel, de, ate });
    if (j.erro) throw new Error(j.erro);
    const max = Math.max(1, ...j.porDia.map(d => d.v)), L = j.lembretes;
    $('#dRes').innerHTML = `<p class="suave peq">${dataBR(j.de)} a ${dataBR(j.ate)}</p>
      <div class="kpis">${kpi('O.S. fechadas', j.os)}${kpi('Faturamento', brl(j.faturamento))}${kpi('Ticket médio', brl(j.ticket))}${kpi('Trocas de óleo', j.trocas)}${kpi('Litros de óleo', fmtQtd(j.litros))}${kpi('Clientes novos', j.novosClientes)}${kpi('Trocas vencendo em 15 dias', j.vencendo)}</div>
      <div class="bloco"><h3>Faturamento por dia</h3>${j.porDia.length ? `<div class="barras" role="img" aria-label="Faturamento por dia">${j.porDia.map(d => `<div style="height:${Math.max(2, Math.round(d.v / max * 100))}%" title="${dataBR(d.data)}: ${brl(d.v)} (${d.n} O.S.)"></div>`).join('')}</div><div class="suave peq" style="display:flex;justify-content:space-between"><span>${dataBR(j.porDia[0].data)}</span><span>${dataBR(j.porDia[j.porDia.length - 1].data)}</span></div>` : '<p class="suave peq">Sem O.S. fechadas no período.</p>'}</div>
      <div class="bloco"><h3>Produtos mais vendidos</h3>${tabela(['Produto', 'Qtd', 'Valor'], j.produtos.map(p => [p.nome, fmtQtd(p.qtd), brl(p.v)]))}</div>
      ${j.semEstoque && j.semEstoque.length ? `<div class="bloco"><h3>Vendidos e sem estoque no app</h3>${tabela(['Produto', 'Posto', 'Estoque'], j.semEstoque.map(x => [x.nome, nomePosto(x.posto), fmtQtd(x.estoque)]))}</div>` : ''}
      <div class="bloco"><h3>Melhores clientes</h3>${tabela(['Cliente', 'O.S.', 'Valor'], j.clientes.map(c => [c.nome, c.n, brl(c.v)]))}</div>
      <div class="bloco"><h3>Por tipo de veículo</h3>${tabela(['Tipo', 'O.S.', 'Valor'], j.tipos.map(t => [t.chave, t.n, brl(t.v)]))}</div>
      ${postoSel === 'TODOS' ? `<div class="bloco"><h3>Por posto</h3>${tabela(['Posto', 'O.S.', 'Valor'], j.postos.map(p => [postoAtual(p.chave).Nome, p.n, brl(p.v)]))}</div>` : ''}
      <div class="bloco"><h3>Lembretes e pós-venda</h3><p>${L.troca} lembrete(s) de troca; ${L.convertidos} cliente(s) voltaram em até 30 dias${L.troca ? ` (${Math.round(L.convertidos / L.troca * 100)}%)` : ''}. ${L.aniversario} aniversário(s). ${L.posvenda} pós-venda(s)${L.notaMedia ? `, nota média ${fmtQtd(L.notaMedia)}` : ''}.</p></div>`;
  };
  $('#dGo').onclick = e => ocupado(e.currentTarget, carregar);
  await carregar();
}

/* ============ IMPORTAÇÃO DE PRODUTOS ============ */
const CAMPOS_IMP = [
  ['Barras', 'Código de barras', /barra|ean|gtin/], ['Codigo', 'Código interno *', /^c[oó]d|refer|^ref\b|^id/], ['PrecoCompra', 'Preço de compra (custo)', /custo|compra/],
  ['PrecoPrazo', 'Preço a prazo', /prazo|parcel/], ['PrecoVenda', 'Preço à vista', /vista|venda|pre[cç]o|valor|vlr/], ['Estoque', 'Estoque', /estoque|saldo|qtd|quant/], ['Nome', 'Nome/descrição *', /descri|nome|produto/],
  ['Unidade', 'Unidade', /^un|unid/], ['Grupo', 'Grupo', /grupo|fam[ií]l|se[cç][aã]o/], ['Categoria', 'Categoria', /categ|subgrupo|classe/]
];
function telaImportar() {
  V(`<div class="cab"><h1>Importar produtos</h1></div>
    <div class="bloco"><p>Use o relatório de estoque do B2Click (Excel ou CSV) com código, código de barras, nome, preço de venda, preço de compra e estoque. É assim que entra estoque no app: cada importação atualiza os saldos, guarda o histórico e sinaliza as divergências.</p>
    <p class="suave peq">Aceita planilha (Excel/CSV) ou o relatório em PDF. Com o padrão de colunas salvo, é só anexar, conferir e importar.</p>
    ${listaNomes(postoAtual().Lideres).length ? `<div class="campo" style="max-width:24rem;margin-bottom:.7rem"><label for="iResp">Quem está importando (líder de pista / triagem) *</label><select id="iResp"><option value="">Escolha…</option>${listaNomes(postoAtual().Lideres).map(n => `<option${n === S.ultimoResp ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>` : ''}
    <input type="file" id="iArq" accept=".xlsx,.xls,.csv,.txt,.pdf"></div><div id="iPasso"></div>`);
  if ($('#iResp')) $('#iResp').onchange = () => { S.ultimoResp = $('#iResp').value; };
  $('#iArq').onchange = e => ocupado(null, async () => {
    const arq = e.target.files[0];
    if (!arq) return;
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    if (/\.pdf$/i.test(arq.name)) {
      const linhas = await lerPdfTabela(arq);
      let hi = linhas.slice(0, 30).findIndex(r => r.filter(c => /[a-z]/i.test(c)).length >= 3);
      if (hi < 0) hi = 0;
      const n = Math.max(...linhas.map(r => r.length));
      const cab = Array.from({ length: n }, (_, i) => String(linhas[hi][i] || 'Coluna ' + (i + 1)).trim());
      return mapearImportacao(arq.name, cab, linhas.slice(hi + 1).filter(r => r.length >= 3));
    }
    const buf = await arq.arrayBuffer();
    let wb;
    if (/\.(csv|txt)$/i.test(arq.name)) {
      let txt;
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (er) { txt = new TextDecoder('windows-1252').decode(buf); }
      wb = window.XLSX.read(txt, { type: 'string', raw: true });
    } else wb = window.XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const linhas = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    let hi = linhas.slice(0, 20).findIndex(r => r.filter(c => typeof c === 'string' && c.trim()).length >= 3);
    if (hi < 0) hi = 0;
    const cab = linhas[hi].map((c, i) => String(c || 'Coluna ' + (i + 1)).trim());
    const dados = linhas.slice(hi + 1).filter(r => r.some(c => String(c).trim() !== ''));
    mapearImportacao(arq.name, cab, dados);
  });
}
function mapearImportacao(nomeArq, cab, dados) {
  const usados = new Set(), mapa = {};
  let salvo = null; try { salvo = JSON.parse(S.geral.IMPORT_MAPA || 'null'); } catch (e) {}
  if (salvo && Object.keys(salvo).length) {
    Object.entries(salvo).forEach(([k, v]) => { const i = typeof v === 'number' ? v : cab.findIndex(c => norm(c) === norm(v)); if (i >= 0 && i < cab.length) mapa[k] = i; });
  } else CAMPOS_IMP.forEach(([k, , re]) => { const i = cab.findIndex((c, j) => !usados.has(j) && re.test(norm(c))); if (i >= 0) { mapa[k] = i; usados.add(i); } });
  const sel = { modo: 'atualizar', postos: [S.posto] };
  const desenhar = () => {
    const linhasMap = dados.slice(0, 5).map(r => CAMPOS_IMP.map(([k]) => mapa[k] !== undefined ? r[mapa[k]] : ''));
    $('#iPasso').innerHTML = `<div class="bloco"><h2>Colunas do arquivo</h2><p class="suave peq">${esc(nomeArq)}: ${dados.length} linha(s). ${salvo ? '<b>Usando o padrão de colunas salvo.</b> ' : ''}Confira qual coluna é cada informação.</p>
      <div class="campos">${CAMPOS_IMP.map(([k, r]) => `<div class="campo"><label>${r}</label><select data-k="${k}"><option value="">(não importar)</option>${cab.map((c, i) => `<option value="${i}"${mapa[k] === i ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`).join('')}</div>
      <h3 style="margin-top:1rem">Prévia</h3>${tabela(CAMPOS_IMP.map(c => c[1].replace(' *', '')), linhasMap.map(l => l.map(x => String(x))))}</div>
      <div class="bloco"><h2>Para quais postos</h2>
        <label class="check"><input type="radio" name="iPo" value="este" ${sel.postos.length === 1 && sel.postos[0] === S.posto ? 'checked' : ''}><span>Só ${esc(postoAtual().Nome)}</span></label>
        ${S.postos.length > 1 ? `<label class="check"><input type="radio" name="iPo" value="todos" ${sel.postos.length === S.postos.length && S.postos.length > 1 ? 'checked' : ''}><span>Todos os meus postos</span></label><label class="check"><input type="radio" name="iPo" value="alguns" ${sel.alguns ? 'checked' : ''}><span>Alguns</span></label><div id="iAl" class="${sel.alguns ? '' : 'oculto'}" style="padding-left:1.8rem">${S.postos.map(p => `<label class="check"><input type="checkbox" data-p="${esc(p.Codigo)}" ${sel.postos.includes(p.Codigo) ? 'checked' : ''}><span>${esc(p.Nome)}</span></label>`).join('')}</div>` : ''}
        <h3 style="margin-top:1rem">Como importar</h3>
        <label class="check"><input type="radio" name="iModo" value="atualizar" ${sel.modo === 'atualizar' ? 'checked' : ''}><span>Atualizar e acrescentar (não apaga nada)</span></label>
        <label class="check"><input type="radio" name="iModo" value="substituir" ${sel.modo === 'substituir' ? 'checked' : ''}><span>Substituir a lista (apaga do posto os produtos que não vieram no arquivo)</span></label>
        <label class="check" style="margin-top:.8rem"><input type="checkbox" id="iPad"><span>Salvar estas colunas como padrão (pela posição da coluna no arquivo)</span></label>
        <div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="iGo">Importar ${dados.length} produto(s)</button></div><p id="iProg" class="suave peq"></p></div>`;
    $$('#iPasso [data-k]').forEach(s => { s.onchange = () => { if (s.value === '') delete mapa[s.dataset.k]; else mapa[s.dataset.k] = +s.value; desenhar(); }; });
    $$('#iPasso [name=iPo]').forEach(r => { r.onchange = () => { sel.alguns = r.value === 'alguns'; sel.postos = r.value === 'este' ? [S.posto] : r.value === 'todos' ? S.postos.map(p => p.Codigo) : sel.postos; desenhar(); }; });
    $$('#iAl [data-p]').forEach(c => { c.onchange = () => { sel.postos = $$('#iAl [data-p]').filter(x => x.checked).map(x => x.dataset.p); }; });
    $$('#iPasso [name=iModo]').forEach(r => { r.onchange = () => { sel.modo = r.value; }; });
    $('#iGo').onclick = e => ocupado(e.currentTarget, async () => {
      if (mapa.Codigo === undefined || mapa.Nome === undefined) throw new Error('Escolha as colunas de código interno e de nome.');
      if (!sel.postos.length) throw new Error('Escolha pelo menos um posto.');
      const resp = $('#iResp') ? $('#iResp').value : '';
      if ($('#iResp') && !resp) throw new Error('Escolha quem está importando (líder de pista / triagem).');
      if ($('#iPad').checked) { const jm = await api('salvarMapaImport', { mapa }); if (jm.erro) throw new Error(jm.erro); S.geral.IMPORT_MAPA = JSON.stringify(mapa); ls('to_geral', S.geral); }
      if (sel.modo === 'substituir' && !await confirmar(`Os produtos de ${sel.postos.length} posto(s) que não estão no arquivo serão apagados do app. Continuar?`, 'Substituir')) return;
      const linhas = dados.map(r => { const o = {}; Object.entries(mapa).forEach(([k, i]) => { o[k] = r[i]; }); return o; }).filter(o => String(o.Codigo ?? '').trim() !== '');
      const lote = Date.now().toString(36), tam = 700;
      let ins = 0, upd = 0, rem = 0, resumo = null;
      for (let i = 0; i < linhas.length; i += tam) {
        $('#iProg').textContent = `Enviando ${Math.min(i + tam, linhas.length)} de ${linhas.length}…`;
        const j = await api('importarProdutos', { postos: sel.postos, linhas: linhas.slice(i, i + tam), modo: sel.modo, lote, ultimo: i + tam >= linhas.length, arquivo: nomeArq, totalLinhas: linhas.length, responsavel: resp });
        if (j.erro) throw new Error(j.erro);
        ins += j.inseridos; upd += j.atualizados; rem += j.removidos;
        if (j.resumo) resumo = j.resumo;
      }
      $('#iProg').innerHTML = `Pronto: ${ins} novo(s), ${upd} atualizado(s)${rem ? `, ${rem} removido(s)` : ''}.` + (resumo ? `<br>${resumo.entradas} entrada(s) de estoque, ${resumo.precos} preço(s) alterado(s), <b class="${resumo.divergencias ? 'erro-campo' : ''}">${resumo.divergencias} divergência(s)</b>.${pode('ver_compra') ? ' <button class="btn-link" id="iHist">Ver histórico</button>' : ''}` : '');
      if ($('#iHist')) $('#iHist').onclick = () => ir('estoque', { lote });
      toast('Importação concluída.');
      if (sel.postos.includes(S.posto)) sincronizar(true);
    });
  };
  desenhar();
}

/* ============ USUÁRIOS ============ */
async function telaUsuarios() {
  V('<p class="vazio">Carregando usuários…</p>');
  const j = await api('usuarios');
  if (j.erro) throw new Error(j.erro);
  V(`<div class="cab"><h1>Usuários</h1><button class="btn btn-oleo" id="uNovo">Novo usuário</button></div>
    <div class="bloco"><ul class="lista">${j.lista.map((u, i) => `<li><button class="linha-btn" data-u="${i}"><span class="cresce"><span class="tit">${esc(u.Nome)} <span class="suave">(${esc(u.Login)})</span></span><span class="sub">${u.NomePosto ? esc(u.NomePosto) + ' – ' : ''}${esc(PERFIS_NOME[u.Perfil] || u.Perfil)} – ${u.Postos === 'TODOS' ? 'todos os postos' : esc(u.Postos)}${u.UltimoAcesso ? ' – último acesso ' + dataBR(u.UltimoAcesso) : ''}</span></span>${u.Ativo === 'SIM' ? '' : '<span class="selo alerta">inativo</span>'}</button></li>`).join('')}</ul></div>
    <div class="bloco peq"><p><b>Trocador de óleo:</b> consulta preço de venda, estoque e produtos; cadastra cliente, placa, modelo e ficha; abre O.S.</p><p><b>Caixa:</b> tudo do trocador, mais fechar, editar, excluir, imprimir e enviar O.S., lembretes, pós-venda e extrato.</p><p><b>Importação de estoque:</b> importa produtos, preços e estoque.</p><p><b>Gerente:</b> tudo do caixa, mais o painel e o preço de compra.</p><p><b>Administrador:</b> tudo, inclusive usuários e configurações.</p></div>`);
  $('#uNovo').onclick = () => formUsuario(null);
  $$('[data-u]').forEach(b => { b.onclick = () => formUsuario(j.lista[+b.dataset.u]); });
}
function formUsuario(u) {
  const novo = !u;
  u = u || { Login: '', Nome: '', Perfil: 'TROCADOR', Postos: S.posto, Ativo: 'SIM' };
  const todos = u.Postos === 'TODOS', meus = String(u.Postos || '').split(',');
  const m = abrirModal(novo ? 'Novo usuário' : 'Editar usuário', `<div class="campos">
      <div class="campo"><label for="uL">Login</label><input id="uL" type="text" autocapitalize="none" value="${esc(u.Login)}" ${novo ? '' : 'disabled'} placeholder="ex.: joao.trocador"></div>
      <div class="campo"><label for="uN">Nome da pessoa</label><input id="uN" type="text" value="${esc(u.Nome)}"></div>
      <div class="campo largo"><label for="uNP">Nome do posto que aparece para este login</label><input id="uNP" type="text" value="${esc(u.NomePosto || '')}" placeholder="vazio = nome do posto nas Configurações"><span class="suave peq">Aparece no topo do app, na tela inicial, nos cupons, e-mails e mensagens.</span></div>
      <div class="campo"><label for="uE">E-mail (para “Esqueci a senha”)</label><input id="uE" type="email" autocapitalize="none" value="${esc(u.Email || '')}" placeholder="vazio = vai para o administrador"></div>
      <div class="campo"><label for="uP">Perfil</label><select id="uP">${Object.entries(PERFIS_NOME).map(([k, n]) => `<option value="${k}"${k === u.Perfil ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="campo"><label for="uA">Situação</label><select id="uA"><option value="SIM"${u.Ativo === 'SIM' ? ' selected' : ''}>Ativo</option><option value="NAO"${u.Ativo !== 'SIM' ? ' selected' : ''}>Inativo</option></select></div>
      <div class="campo largo"><label for="uS">${novo ? 'Senha inicial (mínimo 6)' : 'Nova senha (deixe vazio para manter)'}</label><input id="uS" type="text" autocomplete="off"><span class="suave peq">No primeiro acesso a pessoa cria a própria senha.</span></div></div>
    <p class="rot" style="margin-top:1rem">Postos</p>
    <label class="check"><input type="radio" name="uPo" value="TODOS" ${todos ? 'checked' : ''}><span>Todos</span></label>
    <label class="check"><input type="radio" name="uPo" value="ALGUNS" ${todos ? '' : 'checked'}><span>Alguns</span></label>
    <div id="uPl" class="${todos ? 'oculto' : ''}" style="padding-left:1.8rem">${S.postos.map(p => `<label class="check"><input type="checkbox" data-p="${esc(p.Codigo)}" ${meus.includes(p.Codigo) ? 'checked' : ''}><span>${esc(p.Nome)}</span></label>`).join('')}</div>
    <div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="uOk">Salvar usuário</button></div>`);
  $$('[name=uPo]', m.el).forEach(r => { r.onchange = () => $('#uPl', m.el).classList.toggle('oculto', r.value === 'TODOS' && r.checked); });
  $('#uOk', m.el).onclick = e => ocupado(e.currentTarget, async () => {
    const td = $('[name=uPo][value=TODOS]', m.el).checked;
    const postos = td ? 'TODOS' : $$('#uPl [data-p]', m.el).filter(x => x.checked).map(x => x.dataset.p).join(',');
    if (!postos) throw new Error('Escolha pelo menos um posto.');
    const j = await api('salvarUsuario', { usuario: { novo, Login: $('#uL', m.el).value.trim().toLowerCase(), Nome: $('#uN', m.el).value.trim(), NomePosto: $('#uNP', m.el).value.trim(), Email: $('#uE', m.el).value.trim(), Perfil: $('#uP', m.el).value, Ativo: $('#uA', m.el).value, Postos: postos, Senha: $('#uS', m.el).value } });
    if (j.erro) throw new Error(j.erro);
    m.fechar(); toast('Usuário salvo.'); render('usuarios');
  });
}

/* ============ CONFIGURAÇÕES ============ */
async function telaConfig() {
  V('<p class="vazio">Carregando configurações…</p>');
  let j = await api('config');
  if (j.erro) throw new Error(j.erro);
  const W = { postos: j.postos.map(p => ({ ...p })), geral: { ...j.geral }, sel: (j.postos[0] || {}).Codigo, mudou: false, verChave: false };
  const SEC = {
    dados: { t: 'Dados do posto', c: [['Nome', 'Nome fantasia do posto'], ['CodigoPosto', 'Código do posto (ex.: 16)'], ['CNPJ', 'CNPJ'], ['Endereco', 'Endereço (aparece na tela de descanso e nas O.S.)'], ['Ativo', 'Situação', 'sel', ['SIM', 'NAO']], ['Emails', 'E-mails do posto (separe por vírgula)'], ['EmailsGerente', 'E-mails do gerente'], ['Caixas', 'Caixas – nomes para escolher ao fechar a O.S. (separe por vírgula)'], ['Lideres', 'Líderes de pista e triagem – nomes para escolher na importação e no ajuste de estoque (separe por vírgula)']], copiar: ['Emails', 'EmailsGerente', 'Caixas', 'Lideres'] },
    avisos: { t: 'Avisos e mensagens', c: [['TeamsWebhook', 'Link do webhook do Teams (Power Automate)'], ['MsgTroca', 'Mensagem do lembrete de troca', 'area'], ['MsgAniversario', 'Mensagem de aniversário', 'area'], ['MsgPosVenda', 'Mensagem de pós-venda', 'area'], ['MsgOS', 'Mensagem da O.S. no WhatsApp', 'area']], copiar: ['TeamsWebhook', 'MsgTroca', 'MsgAniversario', 'MsgPosVenda', 'MsgOS'] },
    regras: { t: 'Regras', c: [['VenderSemEstoque', 'Vender sem estoque', 'sel', ['SIM', 'NAO']], ['ImpressaoPadrao', 'Onde imprimir por padrão', 'impr'], ['ImpressoraPadrao', 'Formato padrão', 'sel', ['80mm', 'A4']], ['AntecedenciaDias', 'Avisar a troca quantos dias antes'], ['DiasPosVenda', 'Pós-venda quantos dias depois da O.S.'], ['IntervaloKm', 'Troca padrão a cada (km)'], ['IntervaloDias', 'Troca padrão a cada (dias)']], copiar: ['VenderSemEstoque', 'ImpressaoPadrao', 'ImpressoraPadrao', 'AntecedenciaDias', 'DiasPosVenda', 'IntervaloKm', 'IntervaloDias'] }
  };
  const PAD = { MsgTroca: j.padrao.troca, MsgAniversario: j.padrao.aniversario, MsgPosVenda: j.padrao.posvenda, MsgOS: j.padrao.os };
  const campo = (p, [c, r, t, ops]) => {
    const v = p[c] ?? '';
    if (t === 'sel') return `<div class="campo"><label>${esc(r)}</label><select data-cfg="${c}">${ops.map(o => `<option value="${o}"${o === v ? ' selected' : ''}>${o === 'NAO' ? 'NÃO' : o}</option>`).join('')}</select>${c === 'VenderSemEstoque' ? '<span class="suave peq">NÃO: a O.S. não aceita produto sem saldo e não fecha. O cupom fiscal sempre é registrado, porque a venda já aconteceu no B2Click.</span>' : ''}</div>`;
    if (t === 'impr') {
      const ags = ((j.agentes[p.Codigo] || {}).agentes || []).map(a => a.nome);
      if (v.startsWith('agente:') && !ags.includes(v.slice(7))) ags.push(v.slice(7));
      const ops = [['', 'Qualquer agente impressor ligado'], ...ags.map(n => ['agente:' + n, 'Agente: ' + n]), ['aqui', 'Neste aparelho (impressão do celular/computador)'], ['pdf', 'Gerar PDF para enviar']];
      return `<div class="campo largo"><label>${esc(r)}</label><select data-cfg="${c}">${ops.map(([k, n]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="suave peq">Fica destacado no botão Imprimir. Na hora, dá para escolher outro agente, o aparelho ou PDF.</span></div>`;
    }
    if (t === 'area') return `<div class="campo largo"><label>${esc(r)}</label><textarea data-cfg="${c}" placeholder="${esc(PAD[c] || '')}">${esc(v)}</textarea></div>`;
    return `<div class="campo${/Webhook|Emails|Endereco|Caixas|Lideres/.test(c) ? ' largo' : ''}"><label>${esc(r)}</label><input type="text" data-cfg="${c}" value="${esc(c === 'CNPJ' ? fmtDoc(v) : v)}"${c === 'CNPJ' ? ' inputmode="numeric"' : ''}>${c === 'Endereco' && v ? `<a class="suave peq" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}">Ver no mapa</a>` : ''}</div>`;
  };
  const desenhar = () => {
    const p = W.postos.find(x => x.Codigo === W.sel);
    const ch = W.geral.AGENTE_CHAVE || '';
    V(`<div class="cab"><h1>Configurações</h1></div>
      <div class="bloco"><h2>Geral</h2><div class="campos">
        <div class="campo"><label for="gEm">E-mail do administrador</label><input id="gEm" type="email" value="${esc(W.geral.EMAIL_ADMIN || '')}"></div>
        <div class="campo"><label>Nome da marca (login e documentos)</label><input type="text" data-g="MARCA_NOME" value="${esc(W.geral.MARCA_NOME || '')}"></div>
        <div class="campo"><label>Nome do app</label><input type="text" data-g="MARCA_SUBTITULO" value="${esc(W.geral.MARCA_SUBTITULO || '')}"></div>
        <div class="campo"><label>Cor principal</label><input type="color" data-g="COR_PRINCIPAL" value="${esc(W.geral.COR_PRINCIPAL || '#4A1B6D')}" style="min-height:2.75rem;width:100%"></div>
        <div class="campo"><label>Cor de destaque</label><input type="color" data-g="COR_DESTAQUE" value="${esc(W.geral.COR_DESTAQUE || '#FFC20E')}" style="min-height:2.75rem;width:100%"></div>
        <div class="campo"><label>Cor secundária (cinza)</label><input type="color" data-g="COR_SECUNDARIA" value="${esc(W.geral.COR_SECUNDARIA || '#58595B')}" style="min-height:2.75rem;width:100%"></div>
        <div class="campo"><label>Estoque: tolerância para divergência</label><input type="text" inputmode="decimal" data-g="ESTOQUE_TOLERANCIA" value="${esc(W.geral.ESTOQUE_TOLERANCIA || '0')}"><span class="suave peq">Diferença até este valor não é sinalizada.</span></div>
        <div class="campo"><label>Tela de descanso depois de (minutos, 0 desliga)</label><input type="text" inputmode="numeric" data-g="DESCANSO_MINUTOS" value="${esc(W.geral.DESCANSO_MINUTOS || '')}"></div>
        <div class="campo"><label>Texto da tela de descanso</label><input type="text" data-g="DESCANSO_TEXTO" value="${esc(W.geral.DESCANSO_TEXTO || '')}"></div>
        <div class="campo largo"><label>Imagens da tela de descanso</label><input type="text" data-g="DESCANSO_IMAGENS" value="${esc(W.geral.DESCANSO_IMAGENS || '')}"><span class="suave peq">Nomes de arquivos enviados ao GitHub junto com o app, ou links de imagem, separados por vírgula. Com mais de uma, elas se alternam.</span></div>
        <div class="campo largo"><label>Cupom fiscal: palavras antes do número da O.S.</label><input type="text" data-g="CUPOM_ROTULO_OS" value="${esc(W.geral.CUPOM_ROTULO_OS || '')}"><span class="suave peq">Separadas por vírgula. Ex.: no cupom “PLACA ABC1D23 OS 125”, a palavra é OS.</span></div>
        <div class="campo"><span class="rot">Chave do agente impressor</span><div class="botoes" style="align-items:center"><code>${esc(W.verChave ? ch : (ch ? ch.slice(0, 4) + '••••••••' : '(sem chave)'))}</code><button class="btn btn-peq" id="gVer">${W.verChave ? 'Esconder' : 'Mostrar'}</button><button class="btn btn-peq" id="gNova">Gerar nova</button></div></div></div>
        <h3 style="margin-top:1rem">Agentes impressores</h3><ul class="lista">${W.postos.map(x => { const a = j.agentes[x.Codigo] || {}; const l = a.agentes || []; return l.length ? l.map(g => `<li class="status-agente ${g.online ? 'on' : 'off'} peq" style="padding:.35rem 0">${esc(x.Nome || x.Codigo)} – ${esc(g.nome)} (${esc(g.destinos.join(' e '))}): ${g.online ? 'ligado' : 'desligado'}${g.versao ? ' – v' + esc(g.versao) : ''}</li>`).join('') : `<li class="status-agente off peq" style="padding:.35rem 0">${esc(x.Nome || x.Codigo)}: nenhum agente</li>`; }).join('')}</ul></div>
      <div class="bloco"><div class="cab"><h2>Postos</h2><button class="btn btn-peq" id="pNovo">+ Novo posto</button></div>
        <div class="abas">${W.postos.map(x => `<button data-p="${esc(x.Codigo)}" class="${x.Codigo === W.sel ? 'ativo' : ''}">${esc(x.Nome || x.Codigo)}</button>`).join('')}</div>
        ${p ? Object.entries(SEC).map(([k, s]) => `<section style="margin-top:1.2rem"><h3>${s.t}</h3><div class="campos">${k === 'dados' ? `<div class="campo"><span class="rot">Código</span><b>${esc(p.Codigo)}</b></div>` : ''}${s.c.map(x => campo(p, x)).join('')}</div>${k === 'avisos' ? '<p class="suave peq">Mensagem vazia usa o texto padrão (em cinza). Pode usar {nome}, {placa}, {modelo}, {data}, {km_txt}, {posto}, {os} e {total}.</p>' : ''}<button class="btn btn-peq" data-aplicar="${k}" style="margin-top:.6rem">📋 Aplicar a outros postos</button></section>`).join('') : '<p class="vazio">Nenhum posto cadastrado.</p>'}
      </div>
      <div class="barra-acoes"><span class="suave peq" style="align-self:center">${W.mudou ? 'Há alterações não salvas.' : ''}</span><button class="btn btn-oleo" id="cfgS" style="margin-left:auto">Salvar alterações</button></div>`);
    $('#gEm').oninput = () => { W.geral.EMAIL_ADMIN = $('#gEm').value.trim(); W.mudou = true; };
    $$('[data-g]').forEach(i => { i.oninput = () => { W.geral[i.dataset.g] = i.value; W.mudou = true; if (i.type === 'color') { S.geral[i.dataset.g] = i.value; aplicarAparencia(); } }; });
    $('#gVer').onclick = () => { W.verChave = !W.verChave; desenhar(); };
    $('#gNova').onclick = async () => {
      if (!await confirmar('Os agentes impressores param até você colocar a chave nova no config.json de cada um. Gerar nova chave?', 'Gerar nova')) return;
      const a = new Uint8Array(10); crypto.getRandomValues(a);
      W.geral.AGENTE_CHAVE = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
      W.mudou = true; W.verChave = true; desenhar();
    };
    $$('[data-p]').forEach(b => { b.onclick = () => { W.sel = b.dataset.p; desenhar(); }; });
    $$('[data-cfg]').forEach(i => { i.oninput = i.onchange = () => { p[i.dataset.cfg] = i.value; if (!W.mudou) { W.mudou = true; } }; });
    $('#pNovo').onclick = async () => {
      const cod = await pedirTexto('Novo posto', 'Código curto do posto (ex.: CARUARU)');
      if (!cod) return;
      const c = cod.toUpperCase().replace(/[^A-Z0-9_]/g, '');
      if (W.postos.some(x => x.Codigo === c)) return toast('Já existe um posto com este código.', 'erro');
      const nome = await pedirTexto('Novo posto', 'Nome do posto', 'Posto ' + cod);
      if (!nome) return;
      W.postos.push({ Codigo: c, Nome: nome, Ativo: 'SIM', VenderSemEstoque: 'SIM', ImpressoraPadrao: '80mm', DiasPosVenda: '7', AntecedenciaDias: '5', IntervaloKm: '10000', IntervaloDias: '180' });
      W.sel = c; W.mudou = true; desenhar();
    };
    $$('[data-aplicar]').forEach(b => { b.onclick = () => aplicarOutros(b.dataset.aplicar); });
    $('#cfgS').onclick = e => ocupado(e.currentTarget, async () => {
      const r = await api('salvarConfig', { postos: W.postos, geral: W.geral });
      if (r.erro) throw new Error(r.erro);
      j = r; W.postos = r.postos.map(x => ({ ...x })); W.geral = { ...r.geral }; W.mudou = false;
      guardarGeral(r.geral);
      toast('Configurações salvas.');
      desenhar();
      sincronizar(true);
    });
  };
  const aplicarOutros = k => {
    const s = SEC[k], p = W.postos.find(x => x.Codigo === W.sel), outros = W.postos.filter(x => x.Codigo !== W.sel);
    if (!outros.length) return toast('Não há outros postos cadastrados.', 'erro');
    const m = abrirModal('Aplicar a outros postos', `<p class="peq">Copiar de <b>${esc(p.Nome)}</b>:</p>${s.copiar.map(c => `<label class="check"><input type="checkbox" data-c="${c}" checked><span>${esc(s.c.find(x => x[0] === c)[1])}</span></label>`).join('')}
      <p class="peq" style="margin-top:1rem">Para quais postos:</p><label class="check"><input type="radio" name="apq" value="todos" checked><span>Todos</span></label><label class="check"><input type="radio" name="apq" value="alguns"><span>Alguns</span></label>
      <div id="apL" class="oculto" style="padding-left:1.8rem">${outros.map(x => `<label class="check"><input type="checkbox" data-d="${esc(x.Codigo)}"><span>${esc(x.Nome)}</span></label>`).join('')}</div>
      <div class="botoes" style="margin-top:1rem"><button class="btn btn-oleo" id="apOk">Aplicar</button></div>`);
    $$('[name=apq]', m.el).forEach(r => { r.onchange = () => $('#apL', m.el).classList.toggle('oculto', r.value === 'todos' && r.checked); });
    $('#apOk', m.el).onclick = () => {
      const campos = $$('[data-c]', m.el).filter(x => x.checked).map(x => x.dataset.c);
      const destinos = $('[name=apq][value=todos]', m.el).checked ? outros : outros.filter(x => $(`[data-d="${x.Codigo}"]`, m.el).checked);
      if (!campos.length || !destinos.length) return toast('Escolha o que copiar e para quais postos.', 'erro');
      destinos.forEach(d => campos.forEach(c => { d[c] = p[c] ?? ''; }));
      W.mudou = true; m.fechar();
      toast(`Copiado para ${destinos.length} posto(s). Toque em Salvar alterações.`);
      desenhar();
    };
  };
  desenhar();
}

/* ============ MAIS ============ */
function telaCombustiveis() {
  let posto = S.posto;
  let L = [];
  const carregar = () => { const l = combustiveisDe(posto); L = (l.length ? l : COMB_PADRAO).map(x => ({ codigo: x.codigo || '', nome: x.nome, un: x.un || 'L', vista: x.vista ?? '', prazo: x.prazo ?? '', ativo: x.ativo !== false })); };
  const dec = v => String(v ?? '').trim() === '' ? '' : num(String(v).replace(/\./g, '').replace(',', '.'));
  const vbr = v => v === '' || v === undefined ? '' : String(v).replace('.', ',');
  const desenhar = () => {
    V(`<div class="cab"><h1>Combustíveis e granel</h1></div>
      ${S.postos.length > 1 ? `<div class="campo" style="max-width:22rem"><label for="cbPo">Posto</label><select id="cbPo">${S.postos.map(p => `<option value="${esc(p.Codigo)}"${p.Codigo === posto ? ' selected' : ''}>${esc(p.Nome)}</option>`).join('')}</select></div>` : ''}
      <div class="bloco"><p class="suave peq" style="margin-top:0">Preço por litro de cada posto. Entram na O.S. pela busca de produtos e usam o preço à vista ou a prazo conforme o pagamento escolhido. Não têm controle de estoque no app. Preço a prazo em branco = igual ao à vista.</p>
      ${L.map((c, i) => `<div class="campos" style="border-bottom:1px solid #eee;padding:.5rem 0">
        <div class="campo"><label>Produto</label><input data-f="nome" data-i="${i}" value="${esc(c.nome)}"></div>
        <div class="campo"><label>Código B2Click</label><input data-f="codigo" data-i="${i}" value="${esc(c.codigo)}" inputmode="numeric"></div>
        <div class="campo"><label>À vista (R$/${esc(c.un)})</label><input data-f="vista" data-i="${i}" value="${esc(vbr(c.vista))}" inputmode="decimal"></div>
        <div class="campo"><label>A prazo (R$/${esc(c.un)})</label><input data-f="prazo" data-i="${i}" value="${esc(vbr(c.prazo))}" inputmode="decimal" placeholder="igual à vista"></div>
        <label class="check campo"><input type="checkbox" data-f="ativo" data-i="${i}" ${c.ativo ? 'checked' : ''}><span>Ativo</span></label>
        <button class="btn btn-peq btn-perigo" data-del="${i}" style="align-self:end">Remover</button></div>`).join('')}
      <div class="botoes" style="margin-top:.8rem"><button class="btn" id="cbAdd">+ Produto a granel</button><button class="btn btn-oleo" id="cbSalvar" style="margin-left:auto">Salvar preços</button></div></div>`);
    $$('[data-f]').forEach(inp => { inp.oninput = inp.onchange = () => { const c = L[+inp.dataset.i]; c[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value; }; });
    $$('[data-del]').forEach(b => { b.onclick = () => { L.splice(+b.dataset.del, 1); desenhar(); }; });
    $('#cbAdd').onclick = () => { L.push({ codigo: '', nome: '', un: 'L', vista: '', prazo: '', ativo: true }); desenhar(); };
    if ($('#cbPo')) $('#cbPo').onchange = () => { posto = $('#cbPo').value; carregar(); desenhar(); };
    $('#cbSalvar').onclick = e => ocupado(e.currentTarget, async () => {
      const lista = L.filter(c => String(c.nome).trim()).map(c => ({ codigo: String(c.codigo).trim(), nome: String(c.nome).trim(), un: c.un || 'L', vista: dec(c.vista) || 0, prazo: dec(c.prazo), ativo: !!c.ativo }));
      if (lista.some(c => c.ativo && !c.vista)) throw new Error('Preencha o preço à vista dos produtos ativos.');
      const j = await api('salvarCombustiveis', { posto, lista });
      if (j.erro) throw new Error(j.erro);
      S.postos = j.postos; salvarSessao(); indexar(); salvarCache();
      toast('Preços salvos.'); carregar(); desenhar();
    });
  };
  carregar(); desenhar();
}
function telaMais() {
  const it = [
    pode('cadastro') && ['modelos', '🚚', 'Catálogo de veículos', 'Modelos com óleo e filtros que usam'],
    pode('os_fechar') && ['cupom', '🧾', 'Cupom fiscal (PDF)', 'Cadastra cliente e produtos e liga à O.S. pelo número'],
    pode('extrato') && ['extrato', '📄', 'Extrato de consumo', 'Por cliente, placa, pedido ou produto'],
    pode('lembretes') && ['lembretes', '🔔', 'Lembretes e pós-venda', 'Troca de óleo, aniversário e pesquisa'],
    pode('dashboard') && ['dashboard', '📊', 'Painel', 'Faturamento, trocas, produtos e clientes'],
    pode('ver_compra') && ['estoque', '📦', 'Histórico de estoque', 'Importações, entradas, divergências e baixas por cupom'],
    pode('importar') && ['importar', '⬆️', 'Importar produtos', 'Preço de venda, compra e estoque do sistema'],
    pode('admin') && ['usuarios', '👥', 'Usuários', 'Logins de trocador, caixa, importação e gerente'],
    pode('admin') && ['config', '⚙️', 'Configurações', 'Postos, mensagens, Teams e impressoras'],
    pode('editar_preco') && ['combustiveis', '⛽', 'Combustíveis e granel', 'Preço à vista e a prazo de gasolina, etanol, diesel, ARLA e óleo a granel'],
    ['senha', '🔑', 'Trocar minha senha', ''],
    ['sair', '↩︎', 'Sair', 'Apaga do aparelho os dados baixados']
  ].filter(Boolean);
  V(`<div class="cab"><h1>Mais</h1></div><div class="bloco menu-mais"><ul class="lista">${it.map(([t, ic, n, d]) => `<li><button class="linha-btn" data-m="${t}"><span class="ic" aria-hidden="true">${ic}</span><span class="cresce"><span class="tit">${n}</span>${d ? `<span class="sub">${d}</span>` : ''}</span></button></li>`).join('')}</ul></div>
    <p class="suave peq">${esc(S.user.nome)} – ${esc(PERFIS_NOME[S.user.perfil] || S.user.perfil)}. App versão ${VERSAO_APP}.</p>`);
  $$('[data-m]').forEach(b => { b.onclick = () => { if (b.dataset.m === 'sair') { confirmar('Sair deste aparelho?', 'Sair').then(ok => { if (ok) sair(false); }); } else ir(b.dataset.m); }; });
}

/* ============ TELA DE DESCANSO ============ */
let descansoT = null, descansoEl = null;
function reiniciarDescanso() {
  clearTimeout(descansoT);
  const min = num((S.geral || {}).DESCANSO_MINUTOS);
  if (min > 0) descansoT = setTimeout(mostrarDescanso, min * 60000);
}
function mostrarDescanso() {
  const livre = !S.token || (S.tela === 'inicio' && !($('#bq') && $('#bq').value));
  if (descansoEl || MODAIS.length || !livre) return reiniciarDescanso();
  const imgs = [];
  String(S.geral.DESCANSO_IMAGENS || '').split(/[,\n]/).forEach(x => {
    const ult = imgs[imgs.length - 1];
    if (ult && /^data:[^,]*$/.test(ult)) imgs[imgs.length - 1] = ult + ',' + x.trim();
    else if (x.trim()) imgs.push(x.trim());
  });
  if (!imgs.length) return;
  let i = 0;
  descansoEl = document.createElement('div');
  descansoEl.className = 'descanso';
  descansoEl.setAttribute('role', 'button');
  descansoEl.setAttribute('aria-label', 'Toque para voltar ao app');
  const po = postoAtual(), nomeP = nomePosto(), end = po.Endereco || '';
  const tarja = src => /(^|\/)descanso\.jpg(\?|$)/.test(src) || (!!window.DEMO_IMAGEM && src === window.DEMO_IMAGEM);
  const sobre = `<div class="desc-tarja"><span>Serviço disponível no ${esc(nomeP)}.</span></div>${end ? `<div class="desc-end">${esc(end)}</div>` : ''}`;
  descansoEl.innerHTML = `<div class="desc-img"><img alt="" src="${esc(imgs[0])}">${tarja(imgs[0]) ? sobre : ''}</div><p>${esc(S.geral.DESCANSO_TEXTO || '')}</p>${!tarja(imgs[0]) && end ? `<p class="desc-rodape">${esc(nomeP)} – ${esc(end)}</p>` : ''}`;
  document.body.appendChild(descansoEl);
  const giro = imgs.length > 1 ? setInterval(() => { i = (i + 1) % imgs.length; $('img', descansoEl).src = imgs[i]; $$('.desc-tarja,.desc-end', descansoEl).forEach(e => { e.hidden = !tarja(imgs[i]); }); }, 12000) : null;
  descansoEl.addEventListener('click', e => { e.stopPropagation(); clearInterval(giro); descansoEl.remove(); descansoEl = null; reiniciarDescanso(); });
}
['pointerdown', 'keydown', 'scroll', 'input'].forEach(ev => document.addEventListener(ev, () => { if (!descansoEl) reiniciarDescanso(); }, { passive: true, capture: true }));

/* ============ CUPOM FISCAL EM PDF ============ */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
/* Relatório em PDF -> linhas e colunas (separa as colunas pelos espaços maiores entre os textos). */
async function lerPdfTabela(arq) {
  await carregarScript(PDFJS);
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await lib.getDocument({ data: new Uint8Array(await arq.arrayBuffer()) }).promise;
  const linhas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const tc = await (await pdf.getPage(n)).getTextContent();
    const grupos = [];
    tc.items.forEach(it => {
      if (!it.str || !it.str.trim()) return;
      const y = it.transform[5];
      let g = grupos.find(gr => Math.abs(gr.y - y) < 2.5);
      if (!g) { g = { y, itens: [] }; grupos.push(g); }
      g.itens.push({ x: it.transform[4], s: it.str, w: it.width, h: Math.abs(it.transform[0]) || 8 });
    });
    grupos.sort((a, b) => b.y - a.y).forEach(g => {
      g.itens.sort((a, b) => a.x - b.x);
      const cel = []; let fim = null;
      g.itens.forEach(it => {
        if (fim !== null && it.x - fim < it.h * 0.9 && cel.length) cel[cel.length - 1] += (it.x - fim > 1 ? ' ' : '') + it.s;
        else cel.push(it.s);
        fim = it.x + it.w;
      });
      linhas.push(cel.map(c => c.trim()));
    });
  }
  return linhas;
}
async function lerPdfLinhas(arq) {
  await carregarScript(PDFJS);
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await lib.getDocument({ data: new Uint8Array(await arq.arrayBuffer()) }).promise;
  const linhas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pg = await pdf.getPage(n);
    const tc = await pg.getTextContent();
    const grupos = [];
    tc.items.forEach(it => {
      if (!it.str || !it.str.trim()) return;
      const y = it.transform[5], x = it.transform[4];
      let g = grupos.find(gr => Math.abs(gr.y - y) < 2.5);
      if (!g) { g = { y, itens: [] }; grupos.push(g); }
      g.itens.push({ x, s: it.str, w: it.width });
    });
    grupos.sort((a, b) => b.y - a.y).forEach(g => {
      g.itens.sort((a, b) => a.x - b.x);
      let t = '', fim = null;
      g.itens.forEach(it => { if (fim !== null && it.x - fim > 1.5 && !t.endsWith(' ')) t += ' '; t += it.s; fim = it.x + it.w; });
      linhas.push(t.replace(/\s+/g, ' ').trim());
    });
  }
  return linhas;
}
const maiusc = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
function regexRotulosOS() {
  const r = String(S.geral.CUPOM_ROTULO_OS || GERAL_PADRAO.CUPOM_ROTULO_OS).split(',').map(x => maiusc(x).trim()).filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\./g, '\\.?').replace(/\s+/g, '\\s*'));
  return new RegExp('(?:^|[^A-Z0-9])(?:' + r.join('|') + ')\\s*(?:N[O°º.]*\\s*)?[:#\\-]?\\s*(\\d{1,8})(?!\\d)');
}
function parsearCupom(linhas) {
  const L = linhas.map(maiusc);
  const r = { numero: '', chave: '', data: '', total: 0, documento: '', nome: '', placa: '', osNumero: '', km: '', itens: [] };
  for (const l of L) { const d = dig(l); if (d.length === 44 && /^\d{2}/.test(d)) { r.chave = d; break; } }
  if (r.chave) r.numero = String(Number(r.chave.slice(25, 34)));
  else for (const l of L) {
    const m = l.match(/(?:NFC-?E|CUPOM|CF-?E|EXTRATO|DOCUMENTO)\D{0,15}N[O°º.]*\s*:?\s*(\d{1,9})/) || l.match(/\bNUMERO\s*:?\s*(\d{1,9})/) || l.match(/\bN[O°º]\.?\s*:?\s*(\d{3,9})\b.*SERIE/);
    if (m) { r.numero = String(Number(m[1])); break; }
  }
  for (const l of L) { const m = l.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2})(:\d{2})?)?/); if (m) { r.data = `${m[3]}-${m[2]}-${m[1]}`; r.dataHora = m[4] ? `${r.data} ${m[4]}${m[5] || ':00'}` : ''; break; } }
  const dinheiro = l => (l.match(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g) || []).map(num);
  for (const re of [/VALOR\s+A\s+PAGAR|TOTAL\s+A\s+PAGAR/, /VALOR\s+TOTAL|TOTAL\s+R\$/, /^TOTAL\b/]) {
    const l = L.find(x => re.test(x) && dinheiro(x).length);
    if (l) { const v = dinheiro(l); r.total = v[v.length - 1]; break; }
  }
  const iCons = L.findIndex(l => /CONSUMIDOR|DESTINATARIO|CLIENTE/.test(l));
  const docRe = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
  const acharDoc = (de, ate) => { for (let i = de; i < ate; i++) for (const d of (L[i].match(docRe) || [])) if (docOk(dig(d))) return { doc: dig(d), i }; return null; };
  let achou = iCons >= 0 ? acharDoc(iCons, Math.min(L.length, iCons + 6)) : null;
  if (!achou) { const todos = []; L.forEach((l, i) => (l.match(docRe) || []).forEach(d => { if (docOk(dig(d))) todos.push({ doc: dig(d), i }); })); achou = todos.find(t => t.doc.length === 11) || todos[1] || null; }
  if (achou) {
    r.documento = achou.doc;
    const linhaDoc = L[achou.i];
    const depois = linhaDoc.split(/\d[\d.\-/]{10,}\d/).pop().replace(/^[\s\-–:]+/, '').trim();
    const nomeLinha = L.slice(Math.max(0, iCons), Math.min(L.length, achou.i + 3)).map(l => (l.match(/NOME\s*:?\s*([A-Z][A-Z .'&-]{3,})/) || [])[1]).find(Boolean);
    const prox = L[achou.i + 1] || '';
    r.nome = (nomeLinha || (/^[A-Z][A-Z .'&-]{4,}$/.test(depois) ? depois : '') || (/^[A-Z][A-Z .'&-]{4,}$/.test(prox) && !/CONSUMIDOR|ENDERECO|RUA|AV\b/.test(prox) ? prox : '')).trim();
  }
  const iPlaca = L.findIndex(l => /PLACA/.test(l));
  const placaRe = /(?:^|[^A-Z0-9])([A-Z]{3})-?(\d[A-Z0-9]\d{2})(?![A-Z0-9])/;
  const ordem = iPlaca >= 0 ? [iPlaca].concat(L.map((_, i) => i).filter(i => i !== iPlaca)) : L.map((_, i) => i);
  for (const i of ordem) { const m = L[i].replace(/PLACA\s*:?/, ' ').match(placaRe); if (m && placaValida(m[1] + m[2])) { r.placa = m[1] + m[2]; break; } }
  const reOS = regexRotulosOS();
  const iP = L.findIndex(l => r.placa && normPlaca(l).includes(r.placa));
  const perto = iP >= 0 ? [iP, iP + 1, iP - 1, iP + 2, iP - 2].filter(i => i >= 0 && i < L.length) : [];
  for (const i of perto.concat(L.map((_, k) => k))) { const m = L[i].match(reOS); if (m) { r.osNumero = String(Number(m[1])); break; } }
  for (const l of L) { const m = l.match(/\bKM\s*:?\s*(\d{1,3}(?:\.\d{3})+|\d{2,7})\b/); if (m) { r.km = dig(m[1]); break; } }
  const M = '(\\d{1,3}(?:\\.\\d{3})*,\\d{2,4}|\\d+,\\d{2,4})', Q = '(\\d+(?:[.,]\\d{1,4})?)', U = '(?:(UN|UND|UNID|L|LT|LTS|PC|PCT|CX|KG|FR|GL|BD|ML|M|JG|KIT)\\s*)?';
  const reUma = new RegExp('^(?:\\d{1,3}\\s+)?(\\S{2,})\\s+(.+?)\\s+' + Q + '\\s*' + U + '(?:X\\s*)?' + M + '\\s+(?:R\\$\\s*)?' + M + '$');
  const reCab = /^(?:\d{1,3}\s+)?(\S{3,})\s+(.+[A-Z].*)$/;
  const reQtd = new RegExp('^' + Q + '\\s*' + U + 'X\\s*' + M + '\\s+(?:\\S+\\s+)?(?:R\\$\\s*)?' + M + '$');
  const confere = (q, u, t) => q > 0 && t > 0 && Math.abs(q * u - t) <= Math.max(0.05, t * 0.005);
  for (let i = 0; i < L.length; i++) {
    let m = L[i].match(reUma);
    if (m && confere(num(m[3]), num(m[5]), num(m[6]))) { r.itens.push({ codigo: m[1], desc: m[2], qtd: num(m[3]), preco: num(m[5]), total: num(m[6]) }); continue; }
    const c = L[i].match(reCab), q = L[i + 1] ? L[i + 1].match(reQtd) : null;
    if (c && q && confere(num(q[1]), num(q[3]), num(q[4]))) { r.itens.push({ codigo: c[1], desc: c[2], qtd: num(q[1]), preco: num(q[3]), total: num(q[4]) }); i++; }
  }
  return r;
}
function itemDoCupom(it) {
  const p = D.prodCod[it.codigo] || D.prodBar[it.codigo] || null;
  const nome = p ? p.Nome : it.desc;
  return { codigo: p ? String(p.Codigo) : String(it.codigo || ''), nome, tipo: adivinharTipo(nome + ' ' + (p && p.Grupo || '')), qtd: it.qtd, preco: it.preco, alternativas: [], noCadastro: !!p };
}
function telaCupom(arg = {}) {
  V(`<div class="cab"><h1>Cupom fiscal</h1></div>
    <div class="bloco"><p>Escolha o PDF do cupom fiscal emitido no B2Click. O app lê o cliente, a placa, o número da O.S. (perto da placa) e os produtos. Você confere tudo antes de gravar.</p>
    <input type="file" id="cpArq" accept="application/pdf,.pdf"></div><div id="cpRev"></div>`);
  $('#cpArq').onchange = e => ocupado(null, async () => {
    const arq = e.target.files[0];
    if (!arq) return;
    $('#cpRev').innerHTML = '<p class="vazio">Lendo o PDF…</p>';
    const linhas = await lerPdfLinhas(arq);
    if (!linhas.join('').trim()) throw new Error('Este PDF não tem texto (parece uma foto). Use o PDF gerado pelo B2Click.');
    const c = parsearCupom(linhas);
    if (arg.osNumero) c.osNumero = String(arg.osNumero);
    await revisarCupom(c, linhas, arq.name);
  });
}
async function revisarCupom(c, linhas, nomeArq) {
  const R = { c, itens: c.itens.map(itemDoCupom), os: null, modo: 'nova', clienteId: '', novo: { Codigo: '', Documento: c.documento, Nome: c.nome, WhatsApp: '', AceitaMsg: 'NAO' }, placa: c.placa, km: c.km };
  const porDoc = c.documento ? D.clientes.find(x => dig(x.Documento) === c.documento) : null;
  const porPlaca = c.placa && D.veiPorPlaca[c.placa] ? D.cli[D.veiPorPlaca[c.placa].ClienteId] : null;
  R.clienteId = (porDoc || porPlaca || {}).Id || '';
  const buscarOS = async () => {
    R.os = null; R.modo = 'nova';
    if (!c.osNumero) return;
    const j = await api('obterOS', { numero: c.osNumero });
    if (j.ok) {
      R.os = prepararOS(j.os); R.modo = 'substituir';
      if (R.os.ClienteId) R.clienteId = R.os.ClienteId;
      if (!R.placa && R.os.Placa) R.placa = R.os.Placa;
    }
  };
  await buscarOS();
  const desenhar = () => {
    const cli = D.cli[R.clienteId], soma = R.itens.reduce((t, i) => t + arred(num(i.qtd) * num(i.preco)), 0);
    const o = R.os;
    const outroCli = o && c.documento && cli && dig(cli.Documento) && dig(cli.Documento) !== c.documento;
    $('#cpRev').innerHTML = `
      <div class="bloco"><h2>Cupom</h2><div class="campos">
        <div><span class="rot">Número</span><br><b>${esc(c.numero || 'não encontrado')}</b></div><div><span class="rot">Data</span><br>${esc(dataBR(c.data) || '–')}</div>
        <div><span class="rot">Total do cupom</span><br><b>${c.total ? brl(c.total) : '–'}</b></div><div class="largo"><span class="rot">Chave</span><br><span class="peq">${esc(c.chave || 'não encontrada')}</span></div></div>
        <details style="margin-top:.6rem"><summary class="peq" style="cursor:pointer">Ver o texto lido do PDF (${linhas.length} linhas)</summary><pre class="peq rolar" style="white-space:pre-wrap;background:var(--sup2);padding:.6rem;border-radius:8px">${esc(linhas.join('\n'))}</pre></details></div>
      <div class="bloco"><h2>O.S.</h2><div class="botoes" style="flex-wrap:nowrap;align-items:flex-end"><div class="campo" style="flex:1"><label for="cpOS">Número da O.S. no cupom</label><input id="cpOS" type="text" inputmode="numeric" value="${esc(c.osNumero)}"></div><button class="btn" id="cpOSb">Buscar</button></div>
        ${o ? `<p style="margin-top:.6rem">O.S. nº <b>${esc(o.Numero)}</b> – ${esc(o.ClienteNome)} – ${esc(fmtPlaca(o.Placa))} – ${brl(o.Total)} ${seloStatus(o.Status)}</p>
          ${o.CupomNumero ? `<p class="erro-campo">Esta O.S. já tem o cupom nº ${esc(o.CupomNumero)} vinculado.</p>` : ''}
          <label class="check"><input type="radio" name="cpM" value="substituir" ${R.modo === 'substituir' ? 'checked' : ''}><span>Vincular e trocar os itens da O.S. pelos do cupom (preços do cupom)</span></label>
          <label class="check"><input type="radio" name="cpM" value="manter" ${R.modo === 'manter' ? 'checked' : ''}><span>Vincular e manter os itens da O.S.</span></label>
          <label class="check"><input type="radio" name="cpM" value="nova" ${R.modo === 'nova' ? 'checked' : ''}><span>Não é esta O.S.: criar uma O.S. nova</span></label>`
        : `<p class="suave peq" style="margin-top:.6rem">${c.osNumero ? `A O.S. nº ${esc(c.osNumero)} não foi encontrada neste posto.` : 'O cupom não traz número de O.S.'} Será criada uma O.S. nova, já fechada, com os itens do cupom.</p>`}</div>
      <div class="bloco"><h2>Cliente e placa</h2>
        ${cli ? `<p><b>${esc(cli.Nome)}</b>${cli.Codigo ? ' – cód. ' + esc(cli.Codigo) : ''}<br><span class="suave peq">${esc(docMascarado(cli.Documento))}</span></p>${outroCli ? '<p class="erro-campo">O CPF/CNPJ do cupom é diferente do cliente desta O.S.</p>' : ''}
          <div class="botoes"><button class="btn btn-peq" id="cpTroca">Trocar cliente</button><button class="btn btn-peq" id="cpNovo">Cadastrar como cliente novo</button></div>`
        : `<p class="suave peq">Cliente não encontrado no cadastro: confira os dados para cadastrar.</p><div class="campos">
          <div class="campo"><label for="cnCod">Código no B2Click</label><input id="cnCod" type="text" value="${esc(R.novo.Codigo)}"></div>
          <div class="campo"><label for="cnDoc">CPF/CNPJ</label><input id="cnDoc" type="text" inputmode="numeric" value="${esc(fmtDoc(R.novo.Documento))}"></div>
          <div class="campo"><label for="cnNome">Nome *</label><input id="cnNome" type="text" value="${esc(R.novo.Nome)}"></div>
          <div class="campo"><label for="cnW">WhatsApp</label><input id="cnW" type="tel" value="${esc(fmtFone(R.novo.WhatsApp))}"></div>
          <label class="check campo largo"><input type="checkbox" id="cnA" ${R.novo.AceitaMsg === 'SIM' ? 'checked' : ''}><span>O cliente autorizou receber mensagens.</span></label></div>
          <div class="botoes" style="margin-top:.5rem"><button class="btn btn-peq" id="cpTroca">Escolher cliente já cadastrado</button></div>`}
        <div class="campos" style="margin-top:.8rem"><div class="campo"><label for="cpPl">Placa</label><input id="cpPl" type="text" autocapitalize="characters" maxlength="8" value="${esc(fmtPlaca(R.placa))}"></div>
        <div class="campo"><label for="cpKm">KM</label><input id="cpKm" type="text" inputmode="numeric" value="${esc(R.km)}"></div></div></div>
      <div class="bloco"><h2>Produtos do cupom</h2>
        ${R.itens.length ? R.itens.map((it, i) => `<div class="veic" data-i="${i}"><div style="display:flex;justify-content:space-between;gap:.5rem"><div><b>${esc(it.nome)}</b><br><span class="suave peq">${it.codigo ? 'cód. ' + esc(it.codigo) + ' – ' : ''}${it.noCadastro ? 'no cadastro de produtos' : 'fora do cadastro de produtos'}</span></div><button class="btn-link" data-rm aria-label="Tirar" style="font-size:1.4rem">×</button></div>
          <div class="botoes" style="align-items:center;margin-top:.3rem"><label class="peq">Qtd <input data-q type="text" inputmode="decimal" value="${esc(String(it.qtd).replace('.', ','))}" style="width:5rem;min-height:2.3rem"></label><label class="peq">Preço <input data-p type="text" inputmode="decimal" value="${esc(num(it.preco).toFixed(2).replace('.', ','))}" style="width:6.5rem;min-height:2.3rem"></label><b class="num" style="margin-left:auto">${brl(num(it.qtd) * num(it.preco))}</b></div></div>`).join('')
          : '<p class="erro-campo">Nenhum produto reconhecido automaticamente. Adicione abaixo ou mande um cupom de exemplo para ajustar a leitura.</p>'}
        <button class="btn btn-peq" id="cpAdd" style="margin-top:.5rem">+ Produto</button>
        <div class="totais"><span>Soma dos itens <b class="num">${brl(soma)}</b></span>${c.total && Math.abs(soma - c.total) > 0.01 ? `<span class="${soma < c.total ? 'erro-campo' : 'suave'}">Total do cupom ${brl(c.total)}${soma > c.total ? ` – a diferença de ${brl(soma - c.total)} entra como desconto` : ' – falta item'}</span>` : ''}</div></div>
      <div class="barra-acoes"><button class="btn btn-oleo" id="cpGo">Gravar cupom</button></div>`;
    const ligarNovo = () => { if (!$('#cnNome')) return; R.novo = { Codigo: $('#cnCod').value.trim(), Documento: dig($('#cnDoc').value), Nome: $('#cnNome').value.trim(), WhatsApp: dig($('#cnW').value), AceitaMsg: $('#cnA').checked ? 'SIM' : 'NAO' }; };
    $$('#cpRev input').forEach(i => i.addEventListener('change', ligarNovo));
    $('#cpOSb').onclick = e => ocupado(e.currentTarget, async () => { c.osNumero = dig($('#cpOS').value); await buscarOS(); desenhar(); });
    $$('[name=cpM]').forEach(r => { r.onchange = () => { R.modo = r.value; }; });
    $('#cpTroca').onclick = async () => { const x = await escolherCliente(); if (x && x.c) { R.clienteId = x.c.Id; desenhar(); } else if (x && x.novo) { R.clienteId = ''; desenhar(); } };
    if ($('#cpNovo')) $('#cpNovo').onclick = () => { R.clienteId = ''; desenhar(); };
    $('#cpPl').oninput = () => { R.placa = normPlaca($('#cpPl').value); };
    $('#cpKm').oninput = () => { R.km = dig($('#cpKm').value); };
    $$('#cpRev [data-i]').forEach(box => {
      const it = R.itens[+box.dataset.i];
      $('[data-rm]', box).onclick = () => { R.itens.splice(+box.dataset.i, 1); desenhar(); };
      $('[data-q]', box).onchange = () => { it.qtd = num($('[data-q]', box).value); desenhar(); };
      $('[data-p]', box).onchange = () => { it.preco = num($('[data-p]', box).value); desenhar(); };
    });
    $('#cpAdd').onclick = async () => { const p = await escolherProduto({ permitirLivre: true }); if (p) { R.itens.push({ codigo: String(p.Codigo || ''), nome: p.Nome, tipo: adivinharTipo(p.Nome), qtd: 1, preco: num(p.PrecoVenda), alternativas: [], noCadastro: !p._livre }); desenhar(); } };
    $('#cpGo').onclick = e => ocupado(e.currentTarget, () => { ligarNovo(); return gravarCupom(R); });
  };
  desenhar();
}
async function gravarCupom(R) {
  const c = R.c;
  if (!R.itens.length && R.modo !== 'manter') throw new Error('Nenhum produto para gravar.');
  if (R.placa && !placaValida(R.placa)) throw new Error('Confira a placa.');
  if (!c.numero && !c.chave && !await confirmar('Não achei o número nem a chave do cupom. Gravar mesmo assim?', 'Gravar')) return;
  let cli = D.cli[R.clienteId];
  if (!cli) {
    const n = R.novo;
    if (!n.Nome) throw new Error('Informe o nome do cliente.');
    if (n.Documento && !docOk(n.Documento)) throw new Error('CPF/CNPJ do cliente inválido.');
    const par = clienteParecidos(n, R.placa ? [R.placa] : []).filter(x => x.s >= 0.8);
    if (par.length) {
      const r = await perguntar('Cliente parecido já cadastrado', `<ul class="lista">${par.map(p => `<li style="padding:.5rem 0"><b>${esc(p.x.Nome)}</b> <span class="selo oleo">${esc(p.mot)}</span><div style="margin-top:.3rem"><button class="btn btn-peq btn-oleo" data-valor="${esc(p.x.Id)}">É o mesmo: usar este</button></div></li>`).join('')}</ul>`, [{ rotulo: 'É diferente: cadastrar novo', valor: 'NOVO', classe: 'btn-primario' }]);
      if (r === null) return;
      if (r !== 'NOVO') cli = D.cli[r];
    }
    if (!cli) {
      let j = await api('salvarCliente', { cliente: { ...n, Obs: 'Cadastrado pelo cupom fiscal ' + (c.numero || '') }, veiculos: [] });
      if (j.erro === 'DUPLICADO') { cli = D.cli[j.existente.Id] || j.existente; }
      else if (j.erro) throw new Error(j.msg || j.erro);
      else { upsert('clientes', j.cliente); aposSalvar(); cli = j.cliente; }
    }
  }
  let v = R.placa ? D.veiPorPlaca[R.placa] : null;
  if (R.placa && (!v || v.ClienteId !== cli.Id)) {
    const base = { Placa: R.placa, ClienteId: cli.Id, KmAtual: R.km || '' };
    let j = await api('salvarVeiculo', { veiculo: base });
    if (j.erro === 'PLACA_EXISTE') {
      if (await confirmar(`${j.msg} Passar a placa para ${cli.Nome}?`, 'Passar a placa')) j = await api('salvarVeiculo', { veiculo: { ...base, transferir: true } });
      else j = { ok: true, veiculo: v };
    }
    if (j.erro) throw new Error(j.msg || j.erro);
    if (j.veiculo) { upsert('veiculos', j.veiculo); aposSalvar(); v = D.vei[j.veiculo.Id] || j.veiculo; }
  }
  const usarOS = R.os && R.modo !== 'nova';
  const o = usarOS ? { ...R.os } : { Id: '', Posto: S.posto, Data: c.data || hojeISO(), Itens: [], Desconto: 0, Obs: 'O.S. criada pelo cupom fiscal.', TrocaOleo: false };
  if (!usarOS || R.modo === 'substituir') {
    o.Itens = R.itens;
    const soma = R.itens.reduce((t, i) => t + arred(num(i.qtd) * num(i.preco)), 0);
    o.Desconto = c.total && soma - c.total > 0.009 ? arred(soma - c.total) : 0;
  }
  if (!usarOS) o.TrocaOleo = o.Itens.some(i => i.tipo === 'OLEO_MOTOR');
  if (!o.ClienteId) { o.ClienteId = cli.Id; o.ClienteNome = cli.Nome; }
  if (v && !o.VeiculoId) { o.VeiculoId = v.Id; o.Placa = v.Placa; }
  if (R.km && !num(o.Km)) o.Km = R.km;
  Object.assign(o, { CupomNumero: c.numero, CupomChave: c.chave, CupomData: c.dataHora || c.data, CupomTotal: c.total, Origem: usarOS ? 'OS+CUPOM' : 'CUPOM' });
  const j = await api('salvarOS', { os: { ...o, Itens: o.Itens.map(i => ({ codigo: i.codigo, nome: i.nome, tipo: i.tipo, qtd: num(i.qtd), preco: num(i.preco) })) }, fechar: true });
  if (j.erro) throw new Error(j.erro);
  if (j.veiculo) { upsert('veiculos', j.veiculo); aposSalvar(); }
  aplicarEstoque(j.estoque);
  toast(`Cupom registrado na O.S. nº ${j.os.Numero}${j.estoque && j.estoque.length ? ' e baixa de ' + j.estoque.length + ' produto(s) no estoque' : ''}.`);
  ir('os-form', { id: j.os.Id }, { substituir: true });
  if (pode('imprimir')) setTimeout(async () => {
    const r = await perguntar('Imprimir a O.S.?', '<p>Cupom gravado. Quer imprimir a O.S. agora (cupom 80 mm ou A4)?</p>', [{ rotulo: 'Agora não', valor: null }, { rotulo: 'Imprimir', valor: 'S', classe: 'btn-oleo' }]);
    if (r && S.osAtual) await ocupado(null, () => menuImprimir(fmt => docOS(S.osAtual, fmt), 'O.S. ' + S.osAtual.Numero));
  }, 700);
}

/* ============ HISTÓRICO DE ESTOQUE ============ */
const SITU_EST = {
  ENTRADA: ['Entrada', 'ok'], SAIDA_SEM_CUPOM: ['Saída sem cupom no app', 'alerta'], ESTOQUE_NEGATIVO: ['Estoque negativo', 'alerta'],
  NOVO: ['Produto novo', ''], PRECO_ALTERADO: ['Só preço alterado', 'oleo'], REMOVIDO: ['Removido do cadastro', 'alerta']
};
const TIPO_MOV = { SAIDA_CUPOM: 'Baixa pelo cupom', SAIDA_CUPOM_JA_NO_RELATORIO: 'Cupom já estava no relatório (sem baixa)', ESTORNO_EDICAO: 'Estorno por edição da O.S.', ESTORNO_EXCLUSAO: 'Estorno por exclusão da O.S.' };
const ehDiverg = x => ['SAIDA_SEM_CUPOM', 'ESTOQUE_NEGATIVO', 'REMOVIDO'].includes(x.Situacao);
function docEstoque(lote, linhas, fmt) {
  const tit = `Importação de estoque – ${dataBR(lote.Data)} ${String(lote.Data).slice(11, 16)}`;
  if (fmt === '80mm') return htmlDoc(`<h1>DIVERGÊNCIAS DE ESTOQUE</h1><p class="c">${esc(nomePosto(lote.Posto))}</p><p class="c">${esc(tit)}</p><hr>${linhas.map(x => `<p><b>${esc(x.Nome)}</b> (${esc(x.Codigo)})</p><table><tr><td>App ${esc(fmtQtd(x.EstoqueAnterior))} → B2Click ${esc(fmtQtd(x.EstoqueImportado))}</td><td class="r">${esc(x.Diferenca ? fmtQtd(x.Diferenca) : '')}</td></tr></table><p class="peq">${esc((SITU_EST[x.Situacao] || [x.Situacao])[0])}</p>`).join('<hr>')}`, fmt, tit);
  return htmlDoc(`<table class="sem" style="border-bottom:3px solid #4A1B6D"><tr><td><h1>Importação de estoque</h1><span class="peq">${esc(nomePosto(lote.Posto))} – arquivo ${esc(lote.Arquivo || '')} – por ${esc(lote.Usuario)}</span></td><td class="r">${dataBR(lote.Data)} ${esc(String(lote.Data).slice(11, 16))}<br>${esc(lote.Entradas)} entrada(s), <b>${esc(lote.Divergencias)} divergência(s)</b></td></tr></table>
    <h2>Produtos</h2><table><tr><th>Código</th><th>Produto</th><th class="r">App antes</th><th class="r">Baixas por cupom</th><th class="r">B2Click</th><th class="r">Diferença</th><th>Situação</th></tr>
    ${linhas.map(x => `<tr><td>${esc(x.Codigo)}</td><td>${esc(x.Nome)}${x.PrecoNovo ? `<br><span class="peq">preço ${brl(x.PrecoAnterior)} → ${brl(x.PrecoNovo)}</span>` : ''}</td><td class="r">${esc(x.EstoqueAnterior === '' ? '–' : fmtQtd(x.EstoqueAnterior))}</td><td class="r">${esc(x.SaidasCupom ? fmtQtd(x.SaidasCupom) : '')}</td><td class="r">${esc(x.EstoqueImportado === '' ? '–' : fmtQtd(x.EstoqueImportado))}</td><td class="r">${esc(x.Diferenca ? fmtQtd(x.Diferenca) : '')}</td><td>${esc((SITU_EST[x.Situacao] || [x.Situacao])[0])}</td></tr>`).join('')}</table>
    <p class="peq" style="margin-top:12px">Saída sem cupom no app: o B2Click tem menos estoque que o app depois das baixas pelos cupons. Pode ser venda sem cupom importado no app, perda ou erro de contagem.</p>`, fmt, tit);
}
async function telaEstoque(arg = {}) {
  let aba = 'imp';
  const posto = S.postos.length > 1 ? 'TODOS' : S.posto;
  const base = () => V(`<div class="cab"><h1>Histórico de estoque</h1>${pode('importar') ? '<button class="btn btn-oleo" id="eImp">Importar estoque</button>' : ''}</div>
    <div class="abas" id="eAbas"><button data-a="imp" class="${aba === 'imp' ? 'ativo' : ''}">Importações</button><button data-a="mov" class="${aba === 'mov' ? 'ativo' : ''}">Baixas por cupom</button></div><div id="eCorpo"><p class="vazio">Carregando…</p></div>`);
  const ligarBase = () => {
    $$('#eAbas button').forEach(b => { b.onclick = () => { aba = b.dataset.a; base(); ligarBase(); (aba === 'imp' ? lista() : movs()).catch(e => toast(e.message, 'erro')); }; });
    if ($('#eImp')) $('#eImp').onclick = () => ir('importar');
  };
  const lista = async () => {
    const j = await api('estoqueLotes', { posto });
    if (j.erro) throw new Error(j.erro);
    $('#eCorpo').innerHTML = j.lista.length ? `<div class="bloco"><ul class="lista">${j.lista.map((l, i) => `<li><button class="linha-btn" data-i="${i}"><span class="cresce"><span class="tit">${dataBR(l.Data)} ${esc(l.Data.slice(11, 16))} – ${esc(nomePosto(l.Posto))}</span><span class="sub">${esc(l.Usuario)}${l.Arquivo ? ' – ' + esc(l.Arquivo) : ''} – ${esc(l.Linhas)} produto(s)</span></span><span style="text-align:right">${+l.Divergencias ? `<span class="selo alerta">${esc(l.Divergencias)} divergência(s)</span>` : '<span class="selo ok">sem divergência</span>'}<br><span class="suave peq">${esc(l.Entradas)} entrada(s), ${esc(l.Precos)} preço(s)</span></span></button></li>`).join('')}</ul></div>`
      : '<p class="vazio">Nenhuma importação de estoque ainda.</p>';
    $$('#eCorpo [data-i]').forEach(b => { b.onclick = () => detalhe(j.lista[+b.dataset.i]).catch(e => toast(e.message, 'erro')); });
    if (arg.lote) { const l = j.lista.find(x => x.Lote === arg.lote); arg.lote = null; if (l) await detalhe(l); }
  };
  const detalhe = async lote => {
    $('#eCorpo').innerHTML = '<p class="vazio">Carregando…</p>';
    const j = await api('estoqueHistorico', { lote: lote.Lote });
    if (j.erro) throw new Error(j.erro);
    const todas = j.lista.filter(x => x.Posto === lote.Posto);
    let f = todas.some(ehDiverg) ? 'div' : 'todos';
    const filtros = { div: ['Divergências', ehDiverg], ent: ['Entradas', x => x.Situacao === 'ENTRADA'], nov: ['Novos', x => x.Situacao === 'NOVO'], pre: ['Preços', x => !!x.PrecoNovo], todos: ['Todos', () => true] };
    const desenhar = () => {
      const l = todas.filter(filtros[f][1]);
      $('#eCorpo').innerHTML = `<div class="bloco"><div class="cab"><div><h2>${dataBR(lote.Data)} ${esc(lote.Data.slice(11, 16))}</h2><span class="suave peq">${esc(nomePosto(lote.Posto))} – ${esc(lote.Usuario)}${lote.Arquivo ? ' – ' + esc(lote.Arquivo) : ''}</span></div><div class="botoes"><button class="btn btn-peq" id="eVolta">Voltar</button>${pode('imprimir') ? '<button class="btn btn-peq" id="eImpr">Imprimir</button>' : ''}</div></div>
        <div class="kpis">${kpi('Produtos no arquivo', lote.Linhas)}${kpi('Entradas', lote.Entradas)}${kpi('Divergências', lote.Divergencias)}${kpi('Preços alterados', lote.Precos)}${kpi('Novos', lote.Novos)}</div>
        <div class="abas" id="eF">${Object.entries(filtros).map(([k, [n, fn]]) => `<button data-f="${k}" class="${k === f ? 'ativo' : ''}">${n} (${todas.filter(fn).length})</button>`).join('')}</div>
        ${l.length ? `<div class="rolar"><table class="tab"><thead><tr><th>Produto</th><th class="r">App antes</th><th class="r">Baixas cupom</th><th class="r">B2Click</th><th class="r">Diferença</th><th>Situação</th></tr></thead><tbody>${l.map(x => { const st = SITU_EST[x.Situacao] || [x.Situacao, '']; return `<tr><td>${esc(x.Nome)}<br><span class="suave peq">${esc(x.Codigo)}${x.PrecoNovo ? ' – preço ' + brl(x.PrecoAnterior) + ' → ' + brl(x.PrecoNovo) : ''}</span></td><td class="r num">${x.EstoqueAnterior === '' ? '–' : fmtQtd(x.EstoqueAnterior)}</td><td class="r num">${x.SaidasCupom ? fmtQtd(x.SaidasCupom) : ''}</td><td class="r num">${x.EstoqueImportado === '' ? '–' : fmtQtd(x.EstoqueImportado)}</td><td class="r num">${x.Diferenca ? (num(x.Diferenca) > 0 ? '+' : '') + fmtQtd(x.Diferenca) : ''}</td><td><span class="selo ${st[1]}">${esc(st[0])}</span></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="vazio">Nada neste filtro.</p>'}
        <p class="suave peq" style="margin-top:.8rem">“App antes” é o saldo do app antes desta importação, já com as baixas pelos cupons. Diferença positiva é entrada de mercadoria. Diferença negativa é saída sem cupom registrado no app (venda sem cupom importado, perda ou erro de contagem).</p></div>`;
      $$('#eF button').forEach(b => { b.onclick = () => { f = b.dataset.f; desenhar(); }; });
      $('#eVolta').onclick = () => lista().catch(e => toast(e.message, 'erro'));
      if ($('#eImpr')) $('#eImpr').onclick = e => ocupado(e.currentTarget, () => menuImprimir(fmt => docEstoque(lote, todas.filter(filtros[f][1]), fmt), 'Estoque ' + dataBR(lote.Data)));
    };
    desenhar();
  };
  const movs = async () => {
    const h = hojeISO();
    $('#eCorpo').innerHTML = `<div class="bloco"><div class="campos"><div class="campo"><label for="mDe">De</label><input id="mDe" type="date" value="${somaDiasISO(h, -7)}"></div><div class="campo"><label for="mAte">Até</label><input id="mAte" type="date" value="${h}"></div></div><div class="botoes" style="margin-top:.6rem"><button class="btn btn-oleo" id="mGo">Ver baixas</button></div></div><div id="mRes"></div>`;
    const carregar = async () => {
      const j = await api('estoqueMov', { de: $('#mDe').value, ate: $('#mAte').value });
      if (j.erro) throw new Error(j.erro);
      $('#mRes').innerHTML = j.lista.length ? `<div class="bloco">${tabela(['Data', 'Produto', 'Qtd', 'Saldo', 'Origem'], j.lista.map(m => [dataBR(m.Data) + ' ' + m.Data.slice(11, 16), m.Nome, fmtQtd(m.Qtd), fmtQtd(m.EstoqueAntes) + ' → ' + fmtQtd(m.EstoqueDepois), (TIPO_MOV[m.Tipo] || m.Tipo) + ' – ' + m.Referencia]))}</div>` : '<p class="vazio">Nenhuma baixa no período.</p>';
    };
    $('#mGo').onclick = e => ocupado(e.currentTarget, carregar);
    await carregar();
  };
  base(); ligarBase();
  await lista();
}

/* ============ INÍCIO DO APP ============ */
const TELAS = {
  inicio: telaInicio, clientes: telaClientes, cliente: telaCliente, 'cliente-form': telaClienteForm, modelos: telaModelos,
  os: telaOSLista, 'os-form': telaOSForm, produtos: telaProdutos, extrato: telaExtrato, lembretes: telaLembretes,
  dashboard: telaDashboard, combustiveis: telaCombustiveis, importar: telaImportar, cupom: telaCupom, estoque: telaEstoque, usuarios: telaUsuarios, config: telaConfig, mais: telaMais, senha: () => telaTrocarSenha(false)
};
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator && !CFG.DEMO) navigator.serviceWorker.register('sw.js').catch(() => {});
  S.geral = { ...GERAL_PADRAO, ...(ls('to_geral') || {}) };
  aplicarAparencia();
  reiniciarDescanso();
  api('publico').then(j => { if (j && j.geral) { guardarGeral(j.geral); if (!S.token && $('#lSenha') && !$('#lSenha').value) telaLogin(); } }).catch(() => {});
  const s = ls('to_sessao');
  if (s && s.token && s.posto) { Object.assign(S, s); entrar(); } else telaLogin();
});

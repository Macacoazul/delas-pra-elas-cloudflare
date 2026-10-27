/* Conta de quem está usando o app: menu, trocar a senha, equipe (só a dona) e restaurar o backup antigo (só a dona). */
import React, { useState, useEffect, useRef } from 'react';
import { t, S } from '../estilos.js';
import { SemRede } from '../api.js';
import { lerBackup } from '../backup.js';
import { todayKey } from '../util.js';
import { Folha } from './folha.jsx';
import { textoDoErro } from './entrada.jsx';

const SENHA_MIN = 8;
const plural = (n, um, varios) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

/* ── menu da conta ──────────────────────────────────────── */
export function SheetConta({ usuario, pendentes, aoFechar, aoAbrir, aoSair }) {
  const [confirmando, setConfirmando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState('');
  const dona = usuario.papel === 'dono';

  const sair = async () => {
    setSaindo(true);
    setErro('');
    try {
      await aoSair();
    } catch (e) {
      setErro(e instanceof SemRede ? 'Sem internet: não dá para sair agora. Tente de novo quando a conexão voltar.' : textoDoErro(e));
      setSaindo(false);
      setConfirmando(false);
    }
  };

  return (
    <Folha titulo="Minha conta" aoFechar={aoFechar}>
      <p style={S.nota}>
        Você entrou como <strong>{usuario.email}</strong>
        {dona ? ' (dona do brechó).' : '.'}
      </p>
      <button style={S.ctaGhost} onClick={() => aoAbrir('senha')}>
        Trocar minha senha
      </button>
      {dona && (
        <>
          <button style={S.ctaGhost} onClick={() => aoAbrir('equipe')}>
            Equipe do app
          </button>
          <a style={S.botaoLink} href="/fretes.html">
            Abrir Fretes
          </a>
          <button style={S.ctaGhost} onClick={() => aoAbrir('restaurar')}>
            Restaurar backup antigo
          </button>
        </>
      )}

      {confirmando ? (
        <div style={{ ...S.histBox, marginTop: 18 }}>
          <div style={{ fontSize: 14, color: t.ink, lineHeight: 1.5 }}>
            {plural(pendentes, 'alteração ainda não foi enviada', 'alterações ainda não foram enviadas')}. Se você sair agora, elas
            serão perdidas.
          </div>
          <button style={{ ...S.cta, marginTop: 12 }} disabled={saindo} onClick={sair}>
            {saindo ? 'Saindo…' : 'Sair mesmo assim'}
          </button>
          <button style={S.ctaGhost} onClick={() => setConfirmando(false)}>
            Voltar
          </button>
        </div>
      ) : (
        <button
          style={{ ...S.ctaGhost, marginTop: 18, color: t.rose, borderColor: t.roseSoft, opacity: saindo ? 0.6 : 1 }}
          disabled={saindo}
          onClick={() => (pendentes > 0 ? setConfirmando(true) : sair())}
        >
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      )}
      {erro && <p style={S.erro}>{erro}</p>}
    </Folha>
  );
}

/* ── trocar a própria senha ─────────────────────────────── */
export function SheetTrocarSenha({ aoFechar, aoTrocar, aoAvisar }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!atual || !nova) return setErro('Preencha a senha atual e a nova.');
    if (nova.length < SENHA_MIN) return setErro(`A senha nova precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (nova !== repetida) return setErro('As duas senhas novas não são iguais.');
    setSalvando(true);
    setErro('');
    try {
      await aoTrocar(atual, nova);
      aoAvisar('Senha trocada');
      aoFechar();
    } catch (e) {
      setErro(textoDoErro(e));
      setSalvando(false);
    }
  };

  const campo = (rotulo, valor, mudar, completar, extra = {}) => (
    <>
      <label style={{ ...S.label, marginTop: 14 }}>{rotulo}</label>
      <input
        style={S.input}
        type="password"
        value={valor}
        autoComplete={completar}
        onChange={(e) => {
          mudar(e.target.value);
          setErro('');
        }}
        {...extra}
      />
    </>
  );

  return (
    <Folha titulo="Trocar minha senha" aoFechar={aoFechar}>
      {campo('Senha atual', atual, setAtual, 'current-password')}
      {campo(`Senha nova (mínimo ${SENHA_MIN} caracteres)`, nova, setNova, 'new-password')}
      {campo('Repita a senha nova', repetida, setRepetida, 'new-password', { onKeyDown: (e) => e.key === 'Enter' && salvar() })}
      {erro && <p style={S.erro}>{erro}</p>}
      <button style={{ ...S.cta, marginTop: 20, opacity: salvando ? 0.6 : 1 }} disabled={salvando} onClick={salvar}>
        {salvando ? 'Salvando…' : 'Trocar a senha'}
      </button>
    </Folha>
  );
}

/* ── equipe ─────────────────────────────────────────────── */
export function SheetEquipe({ aoFechar, equipe, meuEmail, aoAvisar }) {
  const [pessoas, setPessoas] = useState(null);
  const [erro, setErro] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [trabalhando, setTrabalhando] = useState(false);
  const [mexendo, setMexendo] = useState(null); // { email, acao: 'senha' | 'remover' }
  const [novaSenha, setNovaSenha] = useState('');

  const carregar = async () => {
    try {
      setPessoas(await equipe.listar());
    } catch (e) {
      setErro(textoDoErro(e));
    }
  };
  useEffect(() => {
    carregar();
  }, []);

  /** Roda uma ação da equipe, mostra o erro se houver e recarrega a lista. */
  const fazer = async (acao, aviso) => {
    setTrabalhando(true);
    setErro('');
    try {
      await acao();
      aoAvisar(aviso);
      await carregar();
      return true;
    } catch (e) {
      setErro(textoDoErro(e));
      return false;
    } finally {
      setTrabalhando(false);
    }
  };

  const adicionar = async () => {
    if (!email.trim() || !senha) return setErro('Preencha o e-mail e a senha da pessoa.');
    if (senha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (await fazer(() => equipe.adicionar(email.trim(), senha), 'Pessoa adicionada')) {
      setEmail('');
      setSenha('');
    }
  };

  const trocarSenha = async (pessoa) => {
    if (novaSenha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (await fazer(() => equipe.redefinirSenha(pessoa, novaSenha), 'Senha trocada. Ela precisa entrar de novo.')) {
      setMexendo(null);
      setNovaSenha('');
    }
  };

  const remover = async (pessoa) => {
    if (await fazer(() => equipe.remover(pessoa), 'Pessoa removida')) setMexendo(null);
  };

  return (
    <Folha titulo="Equipe do app" aoFechar={aoFechar}>
      <p style={S.nota}>Quem está aqui entra no app da live com o próprio e-mail e senha. Só a dona cadastra e remove pessoas.</p>

      {pessoas === null && !erro && <p style={S.nota}>Abrindo a lista…</p>}
      {(pessoas || []).map((p) => {
        const eu = p.email === meuEmail;
        const aberta = mexendo && mexendo.email === p.email;
        return (
          <div key={p.email} style={{ borderBottom: `1px solid ${t.line}` }}>
            <div style={{ ...S.pessoa, borderBottom: 'none' }}>
              <span style={S.pessoaEmail}>
                {p.email}
                {eu ? ' (você)' : ''}
              </span>
              <span style={S.pessoaPapel}>{p.papel === 'dono' ? 'dona' : 'equipe'}</span>
              {p.papel !== 'dono' && !aberta && (
                <>
                  <button style={S.linkAcao} onClick={() => { setMexendo({ email: p.email, acao: 'senha' }); setNovaSenha(''); setErro(''); }}>
                    Nova senha
                  </button>
                  <button style={S.linkAcao} onClick={() => { setMexendo({ email: p.email, acao: 'remover' }); setErro(''); }}>
                    Remover
                  </button>
                </>
              )}
            </div>
            {aberta && mexendo.acao === 'senha' && (
              <div style={{ paddingBottom: 14 }}>
                <input style={S.input} type="password" autoComplete="new-password" value={novaSenha} placeholder={`Senha nova (mínimo ${SENHA_MIN} caracteres)`} onChange={(e) => { setNovaSenha(e.target.value); setErro(''); }} />
                <button style={{ ...S.cta, marginTop: 10 }} disabled={trabalhando} onClick={() => trocarSenha(p.email)}>
                  Salvar a senha nova
                </button>
                <button style={S.ctaGhost} onClick={() => setMexendo(null)}>
                  Cancelar
                </button>
              </div>
            )}
            {aberta && mexendo.acao === 'remover' && (
              <div style={{ paddingBottom: 14 }}>
                <p style={{ ...S.nota, margin: '0 0 10px' }}>Remover {p.email}? A pessoa perde o acesso na hora.</p>
                <button style={{ ...S.cta, background: t.rose }} disabled={trabalhando} onClick={() => remover(p.email)}>
                  Remover
                </button>
                <button style={S.ctaGhost} onClick={() => setMexendo(null)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        );
      })}

      <label style={{ ...S.label, marginTop: 22 }}>Adicionar uma pessoa</label>
      <input style={S.input} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="off" value={email} placeholder="E-mail dela" onChange={(e) => { setEmail(e.target.value); setErro(''); }} />
      <input style={{ ...S.input, marginTop: 10 }} type="password" autoComplete="new-password" value={senha} placeholder={`Senha para ela (mínimo ${SENHA_MIN} caracteres)`} onChange={(e) => { setSenha(e.target.value); setErro(''); }} onKeyDown={(e) => e.key === 'Enter' && adicionar()} />
      <p style={S.notaPequena}>Combine a senha com ela pessoalmente. Depois ela pode trocar em “Minha conta”.</p>
      {erro && <p style={S.erro}>{erro}</p>}
      <button style={{ ...S.cta, marginTop: 16, opacity: trabalhando ? 0.6 : 1 }} disabled={trabalhando} onClick={adicionar}>
        Adicionar
      </button>
    </Folha>
  );
}

/* ── restaurar o backup antigo ──────────────────────────── */
export function SheetRestaurar({ aoFechar, aoImportar, aoAvisar }) {
  const area = useRef(null);
  const [arquivo, setArquivo] = useState(null); // { nome, texto }
  const [conferido, setConferido] = useState(null); // resultado de lerBackup
  const [erro, setErro] = useState('');
  const [progresso, setProgresso] = useState(null); // { feito, total }
  const [pronto, setPronto] = useState('');

  const escolher = async (e) => {
    const arq = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    setErro('');
    setConferido(null);
    if (arq.size > 20 * 1024 * 1024) return setErro('Esse arquivo é grande demais para ser um backup do app.');
    try {
      setArquivo({ nome: arq.name, texto: await arq.text() });
    } catch {
      setErro('Não consegui ler esse arquivo.');
    }
  };

  const conferir = () => {
    setErro('');
    setPronto('');
    try {
      setConferido(lerBackup(arquivo ? arquivo.texto : area.current.value, todayKey()));
    } catch (e) {
      setConferido(null);
      setErro(e.message);
    }
  };

  const restaurar = async () => {
    setErro('');
    setProgresso({ feito: 0, total: 1 });
    try {
      await aoImportar(conferido, (feito, total) => setProgresso({ feito, total }));
      setPronto(`Pronto: ${plural(conferido.clientes.length, 'cliente', 'clientes')} e ${plural(conferido.vendas.length, 'venda', 'vendas')} restauradas.`);
      aoAvisar('Backup restaurado');
      setConferido(null);
      setArquivo(null);
      if (area.current) area.current.value = '';
    } catch (e) {
      setErro(`O envio parou: ${textoDoErro(e)} O que já foi enviado fica; você pode restaurar de novo sem duplicar nada.`);
    }
    setProgresso(null);
  };

  return (
    <Folha titulo="Restaurar backup antigo" aoFechar={aoFechar}>
      <p style={S.nota}>
        Use o arquivo (ou o texto) que o app antigo gerou em “Baixar backup dos dados”. As fotos das peças não vêm no backup antigo.
        Se uma cliente ou venda do backup já existir aqui, a do backup substitui a que está aqui.
      </p>

      <label style={S.fotoAdd}>
        {arquivo ? `Arquivo: ${arquivo.nome}` : 'Escolher o arquivo do backup'}
        <input type="file" accept=".json,.txt,application/json,text/plain" style={{ display: 'none' }} onChange={escolher} />
      </label>

      {!arquivo && (
        <>
          <label style={{ ...S.label, marginTop: 16 }}>Ou cole o texto do backup aqui</label>
          <textarea ref={area} style={{ ...S.exportTxt, height: 120, fontFamily: 'monospace', fontSize: 12 }} placeholder="{ ... }" onInput={() => setConferido(null)} />
        </>
      )}

      {conferido && (
        <div style={{ ...S.histBox, marginTop: 16 }}>
          <div style={{ fontSize: 15, color: t.ink, lineHeight: 1.5 }}>
            Encontrei {plural(conferido.clientes.length, 'cliente', 'clientes')} e {plural(conferido.vendas.length, 'venda', 'vendas')}.
            {conferido.ignorados > 0 && ` ${plural(conferido.ignorados, 'item foi ignorado', 'itens foram ignorados')} por estar incompleto.`}
          </div>
          {conferido.avisos.length > 0 && <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 6 }}>Ex.: {conferido.avisos.join('; ')}.</div>}
        </div>
      )}

      {erro && <p style={S.erro}>{erro}</p>}
      {pronto && <p style={S.ok}>{pronto}</p>}
      {progresso && <p style={S.notaPequena}>Enviando {progresso.feito.toLocaleString('pt-BR')} de {progresso.total.toLocaleString('pt-BR')}…</p>}

      {conferido ? (
        <button style={{ ...S.cta, marginTop: 18, opacity: progresso ? 0.6 : 1 }} disabled={Boolean(progresso)} onClick={restaurar}>
          {progresso ? 'Restaurando…' : 'Restaurar agora'}
        </button>
      ) : (
        <button style={{ ...S.cta, marginTop: 18 }} onClick={conferir}>
          Conferir o backup
        </button>
      )}
    </Folha>
  );
}

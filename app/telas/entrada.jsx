/* A tela de entrada: login com e-mail e senha, ou o primeiro acesso (quando o app ainda não tem nenhuma conta). */
import React, { useState } from 'react';
import { t, S, sans, display } from '../estilos.js';
import { SemRede } from '../api.js';

const MOLDURA = { ...S.screen, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };

export const textoDoErro = (e) => (e instanceof SemRede ? 'Sem internet. Confira a conexão.' : e && e.message ? e.message : 'Não deu certo. Tente de novo.');

function Titulo({ children }) {
  return (
    <>
      <div style={{ fontFamily: display, fontSize: 34, lineHeight: 1.1, color: t.ink, marginBottom: 6 }}>Delas pra Elas</div>
      <p style={{ fontFamily: sans, fontSize: 15, color: t.inkSoft, margin: '0 0 28px', lineHeight: 1.5 }}>{children}</p>
    </>
  );
}

function Login({ sessaoPerdida, aoEntrar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  const entrar = async () => {
    if (!email.trim() || !senha) return setErro('Preencha o e-mail e a senha.');
    setEntrando(true);
    setErro('');
    try {
      await aoEntrar(email.trim(), senha);
    } catch (e) {
      setErro(textoDoErro(e));
      setEntrando(false);
    }
  };

  return (
    <div style={MOLDURA}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Titulo>{sessaoPerdida ? 'Sua sessão acabou. Entre de novo: o que você lançou ficou guardado e sobe sozinho.' : 'Controle de vendas da live.'}</Titulo>
        <label style={S.label}>E-mail</label>
        <input
          style={S.input}
          type="email"
          value={email}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          inputMode="email"
          onChange={(e) => {
            setEmail(e.target.value);
            setErro('');
          }}
        />
        <label style={{ ...S.label, marginTop: 14 }}>Senha</label>
        <input
          style={S.input}
          type="password"
          value={senha}
          autoComplete="current-password"
          onChange={(e) => {
            setSenha(e.target.value);
            setErro('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />
        {erro && <p style={{ fontFamily: sans, fontSize: 14, color: t.rose, marginTop: 12 }}>{erro}</p>}
        <button style={{ ...S.cta, marginTop: 22, opacity: entrando ? 0.6 : 1 }} disabled={entrando} onClick={entrar}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}

function PrimeiroAcesso({ aoCriar }) {
  const [chave, setChave] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erro, setErro] = useState('');
  const [criando, setCriando] = useState(false);

  const criar = async () => {
    if (!chave || !email.trim() || !senha) return setErro('Preencha todos os campos.');
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    if (senha !== repetida) return setErro('As duas senhas não são iguais.');
    setCriando(true);
    setErro('');
    try {
      await aoCriar({ chave, email: email.trim(), senha });
    } catch (e) {
      setErro(textoDoErro(e));
      setCriando(false);
    }
  };

  const campo = (rotulo, valor, mudar, extra = {}) => (
    <>
      <label style={{ ...S.label, marginTop: 14 }}>{rotulo}</label>
      <input
        style={S.input}
        value={valor}
        autoCapitalize="none"
        autoCorrect="off"
        onChange={(e) => {
          mudar(e.target.value);
          setErro('');
        }}
        {...extra}
      />
    </>
  );

  return (
    <div style={MOLDURA}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Titulo>Primeiro acesso. Crie a conta da dona do brechó; depois ela cadastra a equipe.</Titulo>
        {campo('Senha de instalação', chave, setChave, { type: 'password', autoComplete: 'off' })}
        <p style={S.notaPequena}>É a senha que você guardou no painel da Cloudflare, no segredo ADMIN_SENHA.</p>
        {campo('Seu e-mail', email, setEmail, { type: 'email', inputMode: 'email', autoComplete: 'username' })}
        {campo('Senha nova (mínimo 8 caracteres)', senha, setSenha, { type: 'password', autoComplete: 'new-password' })}
        {campo('Repita a senha nova', repetida, setRepetida, { type: 'password', autoComplete: 'new-password', onKeyDown: (e) => e.key === 'Enter' && criar() })}
        {erro && <p style={{ fontFamily: sans, fontSize: 14, color: t.rose, marginTop: 12 }}>{erro}</p>}
        <button style={{ ...S.cta, marginTop: 22, opacity: criando ? 0.6 : 1 }} disabled={criando} onClick={criar}>
          {criando ? 'Criando…' : 'Criar a conta e entrar'}
        </button>
      </div>
    </div>
  );
}

export function Entrada({ primeiroAcesso, sessaoPerdida, aoEntrar, aoCriar }) {
  return primeiroAcesso ? <PrimeiroAcesso aoCriar={aoCriar} /> : <Login sessaoPerdida={sessaoPerdida} aoEntrar={aoEntrar} />;
}

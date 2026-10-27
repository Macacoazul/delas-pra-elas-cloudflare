/* Folhas de texto e arquivos: mensagem do WhatsApp, exportação da lista de cada cliente e backup dos dados. */
import React, { useState } from 'react';
import { t, S } from '../estilos.js';
import { ABERTURA_PADRAO, FECHAMENTO_PADRAO, todayKey } from '../util.js';

/* ── mensagem do whatsapp ───────────────────────────────── */
function SheetMensagem({ config, onClose, onSave, onFlash }) {
  const [abertura, setAbertura] = useState(config.abertura || '');
  const [fechamento, setFechamento] = useState(config.fechamento || '');

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>Mensagem do WhatsApp</span>
          <button style={S.linkBtn} onClick={onClose}>
            Fechar
          </button>
        </div>
        <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>
          <p style={{ fontSize: 14, color: t.inkSoft, lineHeight: 1.55, margin: '0 0 16px' }}>
            É o texto que acompanha a lista de peças de cada cliente. Escreva{' '}
            <strong>{'{nome}'}</strong> para o nome dela, <strong>{'{data}'}</strong> para a data da
            live, <strong>{'{total}'}</strong> e <strong>{'{apagar}'}</strong> para os valores.
          </p>

          <label style={S.label}>Antes da lista</label>
          <textarea
            value={abertura}
            onChange={(e) => setAbertura(e.target.value)}
            style={{ ...S.exportTxt, height: 170 }}
          />

          <label style={{ ...S.label, marginTop: 16 }}>Depois da lista</label>
          <textarea
            value={fechamento}
            onChange={(e) => setFechamento(e.target.value)}
            style={{ ...S.exportTxt, height: 170 }}
          />

          <button
            style={{ ...S.cta, marginTop: 18 }}
            onClick={() => {
              onSave({ abertura, fechamento });
              onFlash('Mensagem salva');
              onClose();
            }}
          >
            Salvar mensagem
          </button>
          <button
            style={S.ctaGhost}
            onClick={() => {
              setAbertura(ABERTURA_PADRAO);
              setFechamento(FECHAMENTO_PADRAO);
            }}
          >
            Voltar ao texto original
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── exportação ─────────────────────────────────────────── */
function SheetExport({ dados, onClose, onFlash }) {
  const [i, setI] = useState(0);
  const [baixou, setBaixou] = useState('');
  const op = dados.opcoes[i];

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(op.texto);
      onFlash('Copiado, é só colar no WhatsApp');
    } catch (e) {
      onFlash('Selecione o texto e copie na mão');
    }
  };

  const baixar = () => {
    try {
      const blob = op.gerarArquivo
        ? op.gerarArquivo()
        : new Blob(['\ufeff' + op.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = op.arquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBaixou('ok');
    } catch (e) {
      setBaixou('erro');
    }
  };

  const numeroLimpo = String(dados.whatsapp || '').replace(/\D/g, '');
  const temNumero = numeroLimpo.length >= 10;

  const enviar = () => {
    // wa.me espera só dígitos com o código do país junto
    const completo = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;
    const url = `https://wa.me/${completo}?text=${encodeURIComponent(op.texto)}`;
    try {
      const aba = window.open(url, '_blank');
      if (aba) aba.opener = null; // a outra aba não ganha controle sobre esta
      else setBaixou('bloqueado');
    } catch (e) {
      setBaixou('bloqueado');
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>{dados.titulo}</span>
          <button style={S.linkBtn} onClick={onClose}>
            Fechar
          </button>
        </div>
        <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>
          {dados.opcoes.length > 1 && (
            <div style={{ ...S.segmento, marginBottom: 12 }}>
              {dados.opcoes.map((o, n) => (
                <button
                  key={o.rotulo}
                  style={{ ...S.segBtn, ...(n === i ? S.segOnEscopo : {}) }}
                  onClick={() => {
                    setI(n);
                    setBaixou('');
                  }}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
          )}

          <textarea
            readOnly
            value={op.texto}
            onFocus={(e) => e.target.select()}
            style={S.exportTxt}
          />

          {temNumero ? (
            <>
              <button style={{ ...S.cta, marginTop: 14 }} onClick={enviar}>
                Enviar para {dados.titulo.split(' ')[0]} no WhatsApp
              </button>
              <button style={S.ctaGhost} onClick={copiar}>
                Só copiar o texto
              </button>
            </>
          ) : (
            <button style={{ ...S.cta, marginTop: 14 }} onClick={copiar}>
              Copiar para o WhatsApp
            </button>
          )}

          <button style={S.ctaGhost} onClick={baixar}>
            {op.rotuloArquivo || 'Baixar planilha (.csv)'}
          </button>

          {dados.whatsapp !== undefined && !temNumero && (
            <p style={{ fontSize: 13, color: t.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
              Salve o WhatsApp dela no cadastro e o envio passa a ser direto, sem copiar e colar.
            </p>
          )}

          {baixou === 'bloqueado' && (
            <p style={S.erro}>
              O navegador bloqueou a abertura do WhatsApp aqui dentro. Use "Só copiar o texto" —
              o envio direto funciona quando a ferramenta estiver publicada num link próprio.
            </p>
          )}

          {baixou === 'erro' && (
            <p style={S.erro}>
              O download foi bloqueado aqui. Use o botão de copiar — a planilha vai funcionar
              quando a ferramenta estiver publicada num link próprio.
            </p>
          )}
          {baixou === 'ok' && (
            <p style={{ fontSize: 13, color: t.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
              Se o arquivo não aparecer nos downloads, use o botão de copiar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── backup ─────────────────────────────────────────────── */
function SheetBackup({ texto, onClose, onFlash }) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      onFlash('Backup copiado');
    } catch (e) {
      onFlash('Selecione o texto e copie na mão');
    }
  };

  const baixar = () => {
    try {
      const url = URL.createObjectURL(new Blob([texto], { type: 'application/json;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-delas-pra-elas-${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      onFlash('Não deu para baixar o arquivo. Use o botão de copiar.');
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>Backup dos dados</span>
          <button style={S.linkBtn} onClick={onClose}>
            Fechar
          </button>
        </div>
        <div style={{ padding: '4px 20px 20px' }}>
          <p style={{ fontSize: 14, color: t.inkSoft, lineHeight: 1.5, margin: '0 0 14px' }}>
            Baixe o arquivo (ou copie o texto e cole num bloco de notas). É a cópia de segurança de
            tudo que está registrado, menos as fotos das peças.
          </p>
          <textarea
            readOnly
            value={texto}
            onFocus={(e) => e.target.select()}
            style={{
              width: '100%', height: 180, background: t.surface, color: t.inkSoft,
              border: `1px solid ${t.line}`, borderRadius: 9, padding: 12,
              fontSize: 12, fontFamily: 'monospace', resize: 'none',
            }}
          />
          <button style={{ ...S.cta, marginTop: 14 }} onClick={baixar}>
            Baixar arquivo do backup
          </button>
          <button style={S.ctaGhost} onClick={copiar}>
            Copiar o texto
          </button>
        </div>
      </div>
    </div>
  );
}

export { SheetMensagem, SheetExport, SheetBackup };

/** Um relator mínimo para os testes de navegador: roda cada passo, mostra ✓ ou ✗ e guarda a contagem. */

export function criarRelator({ aoFalhar } = {}) {
  let total = 0;
  let falhas = 0;
  return {
    async passo(nome, fn) {
      total += 1;
      const inicio = Date.now();
      try {
        await fn();
        console.log(`  ✓ ${nome} (${Date.now() - inicio} ms)`);
      } catch (e) {
        falhas += 1;
        console.log(`  ✗ ${nome}\n      ${String((e && e.stack) || e).split('\n').slice(0, 7).join('\n      ')}`);
        if (aoFalhar) await aoFalhar(nome, e);
        throw e;
      }
    },
    resumo: () => ({ total, falhas }),
  };
}

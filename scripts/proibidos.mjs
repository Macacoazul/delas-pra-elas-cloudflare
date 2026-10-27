/**
 * O que NÃO pode aparecer no que o projeto entrega (site, arquivos para colar, código do servidor): nada do sistema antigo
 * em nuvem do Google que este projeto deixou de usar, nem endereços dos seus serviços de login.
 * Os nomes são escritos em pedaços de propósito, para a própria lista não ser um lugar onde essas palavras apareçam.
 */
const NOME_ANTIGO = `${'fire'}${'base'}|${'fire'}${'store'}`;
const SERVICOS_DE_LOGIN = `gstatic\\.com/${'fire'}${'basejs'}|identitytoolkit|securetoken\\.google|apis\\.google\\.com/js`;

export const TERMO_DO_SISTEMA_ANTIGO = new RegExp(NOME_ANTIGO, 'i');

/** [padrão, explicação] — para quem monta ou confere arquivos. */
export const PROIBIDOS = [
  [TERMO_DO_SISTEMA_ANTIGO, 'referência ao sistema antigo em nuvem do Google'],
  [new RegExp(SERVICOS_DE_LOGIN, 'i'), 'endereço de serviço de login do Google'],
];

/**
 * Delas pra Elas — worker.js
 * O arquivo principal do Worker: liga o servidor (servidor.js) às páginas do site (site-*.js).
 *
 * Arquivo gerado por "npm run colar" (o texto de verdade fica nas pastas src/, app/ e site/ do projeto).
 * Cole o arquivo INTEIRO, num arquivo com o nome worker.js no editor do Cloudflare. Não precisa mudar nada nele.
 *
 * Para o Cloudflare funcionar o Worker precisa de: o banco D1 ligado com o nome DB e os segredos SEGREDO e ADMIN_SENHA
 * (veja docs/PASSO-A-PASSO.md). Nada disso é escrito em arquivo nenhum.
 */
import { servidor_js } from './servidor.js';
import { site_js } from './base.js';
import sitePaginas from './site-paginas.js';
import siteBiblioteca from './site-biblioteca.js';
import siteLive1 from './site-live-1.js';
import siteLive2 from './site-live-2.js';
import siteLive3 from './site-live-3.js';
import siteFretes1 from './site-fretes-1.js';
import siteFretes2 from './site-fretes-2.js';

export default servidor_js.criarServidor({ arquivos: site_js.juntarSite([sitePaginas, siteBiblioteca, siteLive1, siteLive2, siteLive3, siteFretes1, siteFretes2]) });

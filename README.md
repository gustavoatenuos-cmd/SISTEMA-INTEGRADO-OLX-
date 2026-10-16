# Shopping Car — Sistema Integrado OLX

Central responsiva de gestão de veículos construída em React, Vite e TypeScript. A versão de produção exige login de usuário autorizado no Supabase e utiliza Vercel e API OLX. O painel nunca é exibido sem autenticação.

## Funcionalidades
- Cadastro de veículos: título, marca, modelo, versão, ano, quilometragem, preço, combustível, câmbio, placa, telefone, CEP real, opcionais e descrição.
- Upload de até 20 fotos de 5 MB; primeira foto é a capa.
- Seleção de até 14 cidades de interesse para planejamento comercial.
- Edição, busca, status, remoção e organização do estoque.
- OAuth OLX com escopo autoupload e consulta de catálogo de marca/modelo/versão.
- Publicação/edição de um anúncio por veículo, consulta assíncrona de status e retirada via API.
- Painel de visão geral, veículos, cidades e integração.
- Portal de acesso privado, login por e-mail/senha e recuperação de senha; sem cadastro público de funcionários.
- Teste de conexão OLX pelo endpoint oficial de consulta do plano, sem publicar anúncios.

## Instalação
1. Clone o repositório e execute: npm install
2. Inicie em modo de desenvolvimento: npm run dev
3. Verifique o build: npm run build
4. **Obrigatório para liberar o acesso:** crie um projeto Supabase dedicado à Shopping Car e execute o arquivo supabase/schema.sql no SQL Editor. Sem essas variáveis, aparecerá uma tela de configuração e não o painel.
5. Copie .env.example para .env.local e configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
6. Publique o repositório na Vercel (framework Vite). Configure no projeto Vercel as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, além de OLX_CLIENT_ID, OLX_CLIENT_SECRET, OLX_REDIRECT_URI e APP_ORIGIN.
7. Configure OLX_REDIRECT_URI como https://seu-dominio.vercel.app/api/olx?callback=1 e APP_ORIGIN como https://seu-dominio.vercel.app. A URI exata precisa estar registrada na OLX.
8. Em Supabase > Authentication > Providers > Email, **desative a criação pública de contas (Allow new users to sign up)**. O sistema é exclusivo da equipe.
9. Em Supabase > Authentication > Users, crie ou convide o primeiro usuário autorizado. Não inclua senhas no repositório.
10. Em Supabase > Authentication > URL Configuration, defina Site URL como o domínio da Vercel e adicione `https://seu-dominio.vercel.app/?reset-password=1` aos URLs permitidos para recuperação de senha.
11. Solicite credenciais e homologação da integração a suporteintegrador@olxbr.com. É necessário plano OLX compatível.
12. Faça login no portal Shopping Car, abra Integração OLX, clique em **Conectar conta na OLX**, faça login diretamente em `auth.olx.com.br` e aprove o escopo `autoupload`.
13. Quando voltar ao portal, clique em **Testar conexão com a OLX**. O sistema consulta `GET /autoupload/balance` (somente leitura) e confirma plano e saldo ou informa a causa da falha. Nenhum anúncio é enviado durante o teste.

## IMPORTANTE: cidades e conformidade
O limite de 14 cidades é um planejador comercial, NÃO 14 publicações da mesma oferta.
A OLX proíbe anúncios duplicados simultâneos e envios em massa não homologados. O sistema envia um único anúncio principal por veículo, com CEP real de localização. Nenhuma função de multiplicar anúncios ou manipular CEP foi implementada.

## Segurança
- Tokens OLX ficam em tabela protegida sem políticas de acesso ao frontend, disponíveis somente por service role no servidor. Nunca registre tokens ou senhas em logs públicos.
- Chaves SUPABASE_SERVICE_ROLE_KEY e OLX_CLIENT_SECRET nunca podem usar prefixo VITE_.
- Tabelas de veículos usam RLS por usuário.
- Fotos usam bucket de leitura pública para a OLX conseguir acessá-las; uploads são restritos ao proprietário.
- State OAuth de uso único é validado e expira após dez minutos.
- Não há formulário para digitar e-mail/senha da OLX: o sistema direciona o navegador ao login oficial `auth.olx.com.br`.
- Todas as requisições de publicar/retirar são autenticadas no backend e carregam o veículo pelo dono.

## Passo a passo no painel
- A tela de entrada exige conta da equipe, criada no Supabase por um administrador. O botão **Esqueci minha senha** envia um link para redefinição via e-mail. Não existe cadastro público.
- Em Veículos, clique em Novo veículo e faça o cadastro.
- Adicione fotografias e descrição em Fotos e detalhes.
- Salve até 14 cidades em Cidades. Isso não afeta o CEP real publicado.
- Depois da conexão OLX, selecione os IDs de marca/modelo/versão através dos campos oficiais e salve.
- Clique Publicar para iniciar a importação. A operação retorna status de fila, não confirmação final.
- Use Consultar para obter a aprovação, recusa ou retirada definitiva.
- Para vender, retire o anúncio antes de marcar o veículo como vendido.

## Limites desta primeira versão
A publicação depende de credenciais, homologação e ambiente configurado. Sem isso não há teste real de importação. Sem projeto Supabase e configuração Vercel, não há login operacional (apenas uma tela informativa de configuração).
A API pode recusar anúncios por placa, imagens, plano, duplicidade e moderação. Não há garantias de aprovação.
Sem Supabase configurado, os dados locais não sincronizam entre navegadores/dispositivos.
Automatizações de cron, leads, equipe multiperfil e auditoria avançada ficam para versões futuras.

## Referências
- https://developers.olx.com.br/anuncio/api/home.html
- https://developers.olx.com.br/anuncio/api/oauth.html
- https://developers.olx.com.br/anuncio/api/import.html
- https://developers.olx.com.br/anuncio/api/publishing_status.html
- https://developers.olx.com.br/anuncio/api/autos/sub_auto.html
- https://developers.olx.com.br/anuncio/api/autos/car_models.html
- https://ajuda.olx.com.br/s/article/regras

## Banco de dados e responsabilidade da OLX
A OLX armazena os anúncios publicados. O Supabase armazena as credenciais do **portal interno** (via Auth, com senhas protegidas), veículos em preparação, fotos (Storage), status e token de autorização OLX. A OLX não substitui esse banco interno e não guarda automaticamente rascunhos privados do portal.

## Validação em ambiente real
O CI do GitHub verifica a compilação TypeScript e o build Vite. Antes de produção, ainda é necessário configurar Supabase/Vercel e testar o OAuth com credenciais reais da OLX. O painel não pede login OLX diretamente; o fluxo oficial redireciona ao provedor.

## Identidade visual Shopping Car (outubro/2026)
A marca exibida no login, barra lateral e cabeçalho utiliza a imagem oficial fornecida pela concessionária:
- Logo: https://i.imgur.com/eKoIZdQ.png
- Paleta: preto profundo, branco e verde; estados de erro/alerta preservam suas cores semânticas.
- A imagem mantém sua proporção e recebe dimensões para evitar alterações de layout; em caso de indisponibilidade da hospedagem externa, o sistema exibe a marca textual de reserva.
- Para maior autonomia no futuro, hospedar uma cópia WebP da logo em /public e substituir a URL remota. O endereço fornecido não pôde ser validado no ambiente de desenvolvimento.

## Supabase de produção fornecido pela Shopping Car
O repositório agora inclui **somente a URL e a chave publishable (pública)** em `.env.production`, para que o frontend possa inicializar o Auth e exibir o formulário de login em builds de produção. **Ainda é necessário executar o SQL de `supabase/schema.sql` no projeto indicado e criar usuários no Auth.**

As chaves privadas `SUPABASE_SERVICE_ROLE_KEY` e `OLX_CLIENT_SECRET` **não devem ser enviadas por chat ou commitadas**. Configure-as no cofre de variáveis de ambiente do projeto Vercel. As variáveis de ambiente cadastradas na Vercel podem sobrescrever o arquivo `.env.production` quando a aplicação for compilada; confira para não usar outro Supabase por engano.

Sem credenciais da OLX e autorização profissional real, o botão Conectar OLX permanece indisponível, embora o login do portal funcione após a criação do usuário no Supabase.

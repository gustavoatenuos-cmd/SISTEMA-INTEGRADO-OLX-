# Shopping Car — Sistema Integrado OLX

Central responsiva de gestão de veículos construída em React, Vite e TypeScript. Suporta demonstração local via IndexedDB e produção com Supabase, Vercel e API OLX.

## Funcionalidades
- Cadastro de veículos: título, marca, modelo, versão, ano, quilometragem, preço, combustível, câmbio, placa, telefone, CEP real, opcionais e descrição.
- Upload de até 20 fotos de 5 MB; primeira foto é a capa.
- Seleção de até 14 cidades de interesse para planejamento comercial.
- Edição, busca, status, remoção e organização do estoque.
- OAuth OLX com escopo autoupload e consulta de catálogo de marca/modelo/versão.
- Publicação/edição de um anúncio por veículo, consulta assíncrona de status e retirada via API.
- Painel de visão geral, veículos, cidades e integração.
- Modo local sem credenciais (dados salvos apenas no navegador; sem publicação).

## Instalação
1. Clone o repositório e execute: npm install
2. Inicie em modo de desenvolvimento: npm run dev
3. Verifique o build: npm run build
4. Para ambiente conectado, crie um projeto Supabase e execute o arquivo supabase/schema.sql no SQL Editor.
5. Copie .env.example para .env.local e configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
6. Publique o repositório na Vercel (framework Vite). Configure no projeto Vercel as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, além de OLX_CLIENT_ID, OLX_CLIENT_SECRET, OLX_REDIRECT_URI e APP_ORIGIN.
7. Configure OLX_REDIRECT_URI como https://seu-dominio.vercel.app/api/olx?callback=1 e APP_ORIGIN como https://seu-dominio.vercel.app. A URI exata precisa estar registrada na OLX.
8. Solicite credenciais e homologação da integração a suporteintegrador@olxbr.com. É necessário plano OLX compatível.
9. Cadastre um usuário no Supabase Auth, acesse o painel e conecte a OLX na aba Integração.

## IMPORTANTE: cidades e conformidade
O limite de 14 cidades é um planejador comercial, NÃO 14 publicações da mesma oferta.
A OLX proíbe anúncios duplicados simultâneos e envios em massa não homologados. O sistema envia um único anúncio principal por veículo, com CEP real de localização. Nenhuma função de multiplicar anúncios ou manipular CEP foi implementada.

## Segurança
- Tokens OLX ficam em tabela protegida sem políticas de acesso ao frontend, disponíveis somente por service role no servidor.
- Chaves SUPABASE_SERVICE_ROLE_KEY e OLX_CLIENT_SECRET nunca podem usar prefixo VITE_.
- Tabelas de veículos usam RLS por usuário.
- Fotos usam bucket de leitura pública para a OLX conseguir acessá-las; uploads são restritos ao proprietário.
- State OAuth de uso único é validado e expira após dez minutos.
- Todas as requisições de publicar/retirar são autenticadas no backend e carregam o veículo pelo dono.

## Passo a passo no painel
- Em Veículos, clique em Novo veículo e faça o cadastro.
- Adicione fotografias e descrição em Fotos e detalhes.
- Salve até 14 cidades em Cidades. Isso não afeta o CEP real publicado.
- Depois da conexão OLX, selecione os IDs de marca/modelo/versão através dos campos oficiais e salve.
- Clique Publicar para iniciar a importação. A operação retorna status de fila, não confirmação final.
- Use Consultar para obter a aprovação, recusa ou retirada definitiva.
- Para vender, retire o anúncio antes de marcar o veículo como vendido.

## Limites desta primeira versão
A publicação depende de credenciais, homologação e ambiente configurado. Sem isso não há teste real de importação.
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

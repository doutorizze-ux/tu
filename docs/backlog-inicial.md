# Backlog Inicial

## Prioridade 1 - Base do produto

- Criar projeto web
- Configurar TypeScript
- Configurar banco de dados local
- Criar modelo de usuarios
- Criar autenticacao
- Criar layout base

## Prioridade 2 - Compositor

- Criar perfil de compositor
- Criar composicao persistida
- Editar composicao
- Salvar letra
- Salvar metadados
- Enviar audio guia
- Listar minhas composicoes

## Prioridade 3 - Descoberta

- Criar vitrine
- Criar filtros
- Criar pagina de detalhes
- Favoritar composicao

## Prioridade 4 - Interesse

- Manifestar interesse
- Listar interesses recebidos
- Listar interesses enviados
- Atualizar status do interesse

## Prioridade 5 - Administracao

- Painel admin
- Lista de usuarios
- Lista de composicoes
- Moderacao basica

## Criterios de pronto da primeira entrega codavel

- usuario consegue criar conta
- compositor consegue cadastrar uma composicao
- artista consegue buscar e favoritar
- artista consegue manifestar interesse
- compositor consegue ver interesse recebido
- administrador consegue visualizar usuarios e composicoes

## Concluido nesta fase

- banco SQLite local inicializado
- Prisma Client configurado
- seed de usuarios, composicoes e interesses
- painel lendo dados reais
- composicoes lendo dados reais
- catalogo lendo dados reais
- cadastro de composicao gravando no banco
- cadastro de conta
- login e logout
- sessao persistida por cookie httpOnly
- painel e biblioteca filtrados por usuario logado
- pagina de detalhe da composicao
- controle de visibilidade de letra
- controle de visibilidade de audio guia
- liberacao de conteudo apos interesse registrado
- upload local de audio guia
- rota protegida para servir audio
- player de audio na pagina de detalhe
- modulo de lancamentos musicais
- cadastro de fonograma para distribuicao
- selecao de plataformas digitais
- checklist de master, capa, ISRC, UPC, creditos e splits
- fluxo de revisao de lancamento
- envio por provider de distribuicao configuravel
- status individual por plataforma
- webhook de retorno da distribuidora
- upload real de master final
- upload real de capa de lancamento
- checksum dos arquivos de lancamento
- validador profissional de lancamento
- painel admin de revisao de lancamentos
- aprovacao e reprovacao operacional com historico auditado
- edicao/correcao de lancamento antes do envio real
- reenvio do pacote corrigido para revisao operacional
- central de notificacoes internas
- notificacao para aprovacao, pendencia e reenvio de lancamento
- timeline do lancamento com auditoria, revisoes, assets e entregas
- relatorio/dossie de lancamento com impressao em PDF pelo navegador
- endpoint autenticado para exportar pacote tecnico em JSON
- tela admin de envio assistido para distribuidora real
- painel pos-envio com acompanhamento de plataformas, tentativas e reenvio
- financeiro base por lancamento com receita, repasses e status de pagamento
- exportacao de royalties em CSV e JSON para planilhas/contabilidade
- importacao de relatorios CSV da distribuidora para gerar fechamentos e repasses
- conciliacao financeira para impedir duplicidade de fechamento por plataforma, periodo e moeda
- portal financeiro do cliente para acompanhar royalties e baixar demonstrativos
- compliance inicial com aceite de termos, privacidade e declaracoes por lancamento
- takedown e alteracoes pos-lancamento em fila auditada
- chamados de suporte para direitos, distribuicao, financeiro e acesso

# NF-e Ouro (Nota Fiscal Eletrônica do Ouro)

Este é um repositório de exemplo, em Node.js (utilizando o TypeScript como fonte), de integração da Nota Fiscal Eletrônica do Ouro com os serviços disponibilizados pela respectiva API.

## Dependências

As dependências para este projeto encontram-se no arquivo [package.json](package.json). </br>
O projeto foi criado utilizando a versão 18.16.1 do Node.js e a versão 5.1.3 do TypeScript.

## Uso

A [classe](src/model/NotaOuroCliente.ts) que representa o cliente retorna apenas o corpo da resposta HTTP às requisições (no formato do Axios).
O tratamento das respostas deve ser realizado na implementação do cliente pelos usuários.
Os exemplos de respostas podem ser encontrados no [*Swagger*](https://hom-nfoe.estaleiro.serpro.gov.br/API/swagger/index.html) da API.</br></br>
Exemplos de uso encontram-se na classe de [Testes](tests/NotaOuroClienteExemplo.test.ts).

## Arquivos no formato JavaScript (.js)

Os arquivos TypeScript compilados para o formato JavaScript encontram-se dentro do diretório [build](build).

## Clientes em outras linguagens

O cliente em Python 3 pode ser encontrado em: </br>
[https://github.com/rscarvalho90/NF-e-Ouro-Python](https://github.com/rscarvalho90/NF-e-Ouro-Python)

O cliente em Java pode ser encontrado em: </br>
[https://github.com/rscarvalho90/NF-e-Ouro-Java](https://github.com/rscarvalho90/NF-e-Ouro-Java)
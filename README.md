# Interdisciplinaridade - Banco de Dados Avançado

**Alunos:**
- Victor Scheller Zuccoli
- Diego Vinicius dos Santos
- Igor Fellipe dos Santos

---

## Descrição

Este projeto foi desenvolvido para gerenciar um banco de dados de clientes, atendendo a requisitos específicos de manipulação de dados e controle transacional. A aplicação permite criar um banco de dados com uma tabela de clientes contendo um campo de identificação (`idcliente`) como chave primária e um campo de limite de crédito (`limite`) do tipo `numeric(15,2)`. O sistema realiza operações de listagem de clientes, exibição de detalhes, e atualização de limite, implementando transações para garantir a consistência dos dados.

## Principais Funcionalidades

1. **Busca e listagem de clientes**.
2. **Seleção de um cliente específico para alteração**.
3. **Exibição dos dados do cliente antes da atualização**.
4. **Início de uma transação para alteração do limite, com bloqueio de dados**.
5. **Comparação dos dados atuais com os valores alterados para confirmar a integridade**.
6. **Execução de `COMMIT` ou `ROLLBACK`** com base na confirmação ou cancelamento do usuário, além de mensagens de erro em caso de inconsistências.

---

## Demonstração do Sistema

### Vídeo 1
[![Assista ao Vídeo 1](https://img.youtube.com/vi/HClGS9ZpNkc/0.jpg)](https://youtu.be/HClGS9ZpNkc)

### Vídeo 2
[![Assista ao Vídeo 2](https://img.youtube.com/vi/ABvjtiHGZlo/0.jpg)](https://youtu.be/ABvjtiHGZlo)

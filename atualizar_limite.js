const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configurações de conexão com o banco de dados
const dbConfig = {
    host: '192.168.31.39',
    database: 'db231072110',
    user: 'usuario',
    password: 'usuario',
    port: 5432,
};

// Serve arquivos estáticos na mesma pasta (index.html e styles.css)
app.use(express.static(path.join(__dirname)));

// Rota para servir o arquivo HTML na rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para iniciar transação e obter limite atual do cliente
app.post('/iniciar_transacao', async (req, res) => {
    const { idcliente, valorAdicionado } = req.body;

    if (!idcliente || !valorAdicionado) {
        return res.status(400).send("Dados inválidos. Verifique os campos e tente novamente.");
    }

    const client = new Client(dbConfig);
    await client.connect();

    try {
        // Inicia uma transação e bloqueia a linha do cliente
        await client.query('BEGIN');
        const result = await client.query('SELECT limite FROM cliente WHERE id_cliente = $1 FOR UPDATE', [idcliente]);
        const clienteAtual = result.rows[0];

        if (!clienteAtual) {
            await client.query('ROLLBACK');
            return res.status(404).send("Cliente não encontrado.");
        }

        // Calcula o novo limite
        const novoLimite = parseFloat(clienteAtual.limite) + parseFloat(valorAdicionado);

        // Envia o limite atual e o novo limite para o frontend, mantendo a transação aberta
        res.json({ limiteAtual: clienteAtual.limite, novoLimite });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).send("Erro ao iniciar transação: " + error.message);
    } finally {
        client.end();
    }
});

// Rota para confirmar ou cancelar a atualização do limite
app.post('/confirmar_atualizacao', async (req, res) => {
    const { idcliente, novoLimite, confirmar } = req.body;

    if (!idcliente || !novoLimite || confirmar === undefined) {
        return res.status(400).send("Dados inválidos. Verifique os campos e tente novamente.");
    }

    const client = new Client(dbConfig);
    await client.connect();

    try {
        if (confirmar) {
            // Realiza o UPDATE e confirma a transação
            await client.query('UPDATE cliente SET limite = $1 WHERE id_cliente = $2', [novoLimite, idcliente]);
            await client.query('COMMIT');
            res.send("Limite atualizado com sucesso!");
        } else {
            // Caso o usuário cancele, faz o ROLLBACK
            await client.query('ROLLBACK');
            res.send("Atualização cancelada.");
        }
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).send("Erro ao atualizar limite: " + error.message);
    } finally {
        client.end();
    }
});

// Inicia o servidor na porta 3000
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});

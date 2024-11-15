const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configurações de conexão com o banco de dados
const dbConfig = {
    host: '127.0.0.1',
    database: 'clientes',
    user: 'postgres',
    password: '84568581',
    port: 5432,
};

// Serve arquivos estáticos na mesma pasta (index.html e styles.css)
app.use(express.static(path.join(__dirname)));

// Rota para servir o arquivo HTML na rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para buscar todos os clientes
app.get('/clientes', async (req, res) => {
    const client = new Client(dbConfig);
    await client.connect();
    try {
        const result = await client.query('SELECT * FROM cliente');
        res.json(result.rows); // Retorna os dados dos clientes em JSON
    } catch (error) {
        res.status(500).send("Erro ao buscar clientes: " + error.message);
    } finally {
        client.end();
    }
});

// Rota para buscar um cliente específico
app.get('/cliente/:id', async (req, res) => {
    const { id } = req.params;
    const client = new Client(dbConfig);
    await client.connect();
    try {
        const result = await client.query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).send("Cliente não encontrado.");
        }
        res.json(result.rows[0]); // Retorna o cliente específico em JSON
    } catch (error) {
        res.status(500).send("Erro ao buscar cliente: " + error.message);
    } finally {
        client.end();
    }
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
        console.log('Tentando iniciar transação para o cliente:', idcliente);
        
        // Inicia uma transação e tenta bloquear a linha do cliente
        await client.query('BEGIN');
        const result = await client.query('SELECT limite FROM cliente WHERE id_cliente = $1 FOR UPDATE NOWAIT', [idcliente]);
        const clienteAtual = result.rows[0];

        if (!clienteAtual) {
            await client.query('ROLLBACK');
            console.log('Cliente não encontrado, realizando rollback');
            return res.status(404).send("Cliente não encontrado.");
        }

        // Calcula o novo limite com base no limite atual e no valor adicionado
        const novoLimite = parseFloat(clienteAtual.limite) + parseFloat(valorAdicionado);

        // Envia o limite atual e o novo limite para o frontend
        res.json({ limiteAtual: clienteAtual.limite, novoLimite });
    } catch (error) {
        if (error.code === '55P03') { // Código de erro para lock (bloqueio de linha)
            console.log('Transação já ativa para este cliente.');
            return res.status(409).send("Já existe uma transação ativa para este cliente. Tente novamente mais tarde.");
        } else {
            console.log('Erro ao iniciar transação, realizando rollback:', error.message);
            await client.query('ROLLBACK');
            return res.status(500).send("Erro ao iniciar transação: " + error.message);
        }
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
            console.log('Transação confirmada e limite atualizado');
            res.send("Limite atualizado com sucesso!");
        } else {
            // Caso o usuário cancele, faz o ROLLBACK
            await client.query('ROLLBACK');
            console.log('Transação cancelada e rollback executado');
            res.send("Atualização cancelada.");
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.log('Erro ao atualizar limite, rollback executado');
        res.status(500).send("Erro ao atualizar limite: " + error.message);
    } finally {
        client.end();
    }
});

// Inicia o servidor na porta 3000
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});

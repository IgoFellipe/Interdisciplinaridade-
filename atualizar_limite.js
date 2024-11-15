const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const dbConfig = {
    host: '127.0.0.1',
    database: 'cliente',
    user: 'postgres',
    password: '102030',
    port: 5432,
};

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para listar todos os clientes
app.get('/clientes', async (req, res) => {
    const client = new Client(dbConfig);
    await client.connect();
    try {
        const result = await client.query('SELECT * FROM cliente');
        res.json(result.rows);
    } catch (error) {
        res.status(500).send("Erro ao buscar clientes: " + error.message);
    } finally {
        client.end();
    }
});

// Rota para buscar detalhes de um cliente específico
app.get('/cliente/:id', async (req, res) => {
    const { id } = req.params;
    const client = new Client(dbConfig);
    await client.connect();

    try {
        const result = await client.query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).send("Cliente não encontrado.");
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).send("Erro ao buscar detalhes do cliente: " + error.message);
    } finally {
        client.end();
    }
});

// Rota para iniciar uma transação e verificar consistência dos dados
app.post('/iniciar_transacao', async (req, res) => {
    const { idcliente, valorAdicionado } = req.body;

    // Verifica se já existe uma transação ativa para evitar conflitos
    if (req.app.locals.clientTransaction) {
        return res.status(409).send("Existe outra transação em andamento.");
    }

    const client = new Client(dbConfig);
    await client.connect();

    try {
        await client.query('BEGIN'); // Inicia a transação
        const result = await client.query('SELECT limite FROM cliente WHERE id_cliente = $1 FOR UPDATE NOWAIT', [idcliente]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send("Cliente não encontrado.");
        }

        const clienteAtual = result.rows[0];
        const novoLimite = parseFloat(clienteAtual.limite) + parseFloat(valorAdicionado);

        // Atualiza o limite do cliente na transação
        await client.query('UPDATE cliente SET limite = $1 WHERE id_cliente = $2', [novoLimite, idcliente]);

        // Armazena a conexão para uso posterior, sem fechar ainda
        req.app.locals.clientTransaction = client;
        res.json({ limiteAtual: clienteAtual.limite, novoLimite });
    } catch (error) {
        if (error.code === '55P03') {
            res.status(409).send("Existe outra transação em andamento.");
        } else {
            res.status(500).send("Erro ao iniciar transação: " + error.message);
        }
        client.end();
    }
});

// Rota para confirmar a atualização do limite
app.post('/confirmar_atualizacao', async (req, res) => {
    const { idcliente, novoLimite, confirmar } = req.body;

    // Reutiliza a conexão armazenada
    const client = req.app.locals.clientTransaction;

    if (!client) {
        return res.status(400).send("Nenhuma transação ativa para confirmar.");
    }

    try {
        const result = await client.query('SELECT limite FROM cliente WHERE id_cliente = $1 FOR UPDATE', [idcliente]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send("Cliente não encontrado.");
        }

        const limiteAtual = parseFloat(result.rows[0].limite);

        if (limiteAtual !== novoLimite) {
            await client.query('ROLLBACK');
            return res.status(409).send(`O limite já foi alterado recentemente. Limite atual: R$ ${limiteAtual.toFixed(2)}`);
        }

        if (confirmar) {
            await client.query('COMMIT');
            res.send("Limite atualizado com sucesso!");
        } else {
            await client.query('ROLLBACK');
            res.send("Atualização cancelada.");
        }
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).send("Erro ao atualizar limite: " + error.message);
    } finally {
        client.end(); // Finaliza a conexão após confirmação ou cancelamento
        req.app.locals.clientTransaction = null; // Limpa a transação ativa
    }
});

// Rota para cancelar a transação e realizar o rollback
app.post('/rollback_transacao', async (req, res) => {
    const client = req.app.locals.clientTransaction;

    if (!client) {
        return res.status(400).send("Nenhuma transação ativa para cancelar.");
    }

    try {
        await client.query('ROLLBACK'); // Executa o rollback
        res.send("Transação cancelada com sucesso.");
    } catch (error) {
        res.status(500).send("Erro ao cancelar transação: " + error.message);
    } finally {
        client.end(); // Encerra a conexão
        req.app.locals.clientTransaction = null; // Limpa a transação ativa
    }
});

app.listen(4000, () => {
    console.log("Servidor rodando em http://localhost:4000");
});

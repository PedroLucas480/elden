const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// --- INICIALIZAÇÃO DO BANCO DE DADOS ---
const inicializarBanco = () => {
    const sqlUsuarios = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            senha VARCHAR(255) NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;

    const sqlBuilds = `
        CREATE TABLE IF NOT EXISTS builds (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            descricao TEXT,
            imagem_url VARCHAR(255),
            usuario_id INT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );`;

    db.query(sqlUsuarios, (err) => {
        if (err) return console.error("❌ ERRO NO BANCO (Tabela Usuarios):", err.message);
        
        db.query(sqlBuilds, (err) => {
            if (err) return console.error("❌ ERRO NO BANCO (Tabela Builds):", err.message);
            console.log("✅ Banco de dados pronto e tabelas verificadas!");
        });
    });
};

inicializarBanco();

// --- CONFIGURAÇÕES ESSENCIAIS ---
app.use(cors());
app.use(express.json());

// Libera o acesso às pastas para o navegador
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/imagens', express.static(path.join(__dirname, '../imagens')));
app.use('/index', express.static(path.join(__dirname, '../index')));

// --- ROTA DE CADASTRO ---
app.post('/api/register', async (req, res) => {
    const { username, email, senha } = req.body;

    if (!username || !email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos (Nome, Email e Senha)!" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const query = 'INSERT INTO usuarios (username, email, senha) VALUES (?, ?, ?)';
        db.query(query, [username, email, senhaHash], (err, result) => {
            if (err) {
                console.error("❌ ERRO NO BANCO (Cadastro):", err.message);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ erro: "Este usuário ou email já está em uso!" });
                }
                return res.status(500).json({ erro: "Erro ao salvar no banco de dados." });
            }
            res.status(201).json({ mensagem: "Usuário criado com sucesso!" });
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor ao processar cadastro." });
    }
});

// --- ROTA DE LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos!" });
    }

    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro no banco de dados" });
        if (results.length === 0) return res.status(401).json({ erro: "Usuário não encontrado" });

        const usuario = results[0];

        try {
            const senhaValida = await bcrypt.compare(senha, usuario.senha);

            if (!senhaValida) {
                return res.status(401).json({ erro: "Senha incorreta" });
            }

            const token = jwt.sign(
                { id: usuario.id, email: usuario.email }, 
                'MINHA_CHAVE_SECRETA_123', 
                { expiresIn: '2h' }
            );

            return res.json({ 
                logado: true, 
                token: token,
                usuario: { email: usuario.email, username: usuario.username } 
            });

        } catch (error) {
            console.error("Erro ao validar login:", error);
            return res.status(500).json({ erro: "Erro interno na validação" });
        }
    });
});

// --- ROTAS DE BUILDS (CRUD) ---

// CREATE - Criar Build
app.post('/api/builds', (req, res) => {
    const { nome, descricao, imagem_url, usuario_id } = req.body;
    const query = 'INSERT INTO builds (nome, descricao, imagem_url, usuario_id) VALUES (?, ?, ?, ?)';
    
    db.query(query, [nome, descricao, imagem_url, usuario_id], (err, result) => {
        if (err) return res.status(500).json({ erro: "Erro ao criar build" });
        res.status(201).json({ mensagem: "Build criada com sucesso!", id: result.insertId });
    });
});

// READ - Listar todas as builds (Original sua)
app.get('/api/builds', (req, res) => {
    db.query('SELECT * FROM builds', (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro ao buscar builds" });
        res.json(results);
    });
});

// READ - Buscar uma build por ID (Original sua)
app.get('/api/builds/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM builds WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ mensagem: "Build não encontrada" });
        res.json(result[0]);
    });
});

// UPDATE - Atualizar uma build
app.put('/api/builds/:id', (req, res) => {
    const { id } = req.params;
    const { nome, descricao, imagem_url } = req.body;
    const query = 'UPDATE builds SET nome = ?, descricao = ?, imagem_url = ? WHERE id = ?';
    
    db.query(query, [nome, descricao, imagem_url, id], (err, result) => {
        if (err) return res.status(500).json({ erro: "Erro ao atualizar build" });
        if (result.affectedRows === 0) return res.status(404).json({ erro: "Build não encontrada" });
        res.json({ mensagem: "Build atualizada com sucesso!" });
    });
});

// DELETE - Deletar uma build
app.delete('/api/builds/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM builds WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ erro: "Erro ao deletar build" });
        if (result.affectedRows === 0) return res.status(404).json({ erro: "Build não encontrada" });
        res.json({ mensagem: "Build deletada com sucesso!" });
    });
});

// --- INICIALIZAÇÃO ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log('--------------------------------------------');
    console.log(`🔥 Servidor Elden Builds rodando na porta ${PORT}`);
    console.log(`🔗 Link: http://localhost:${PORT}/index/index.html`);
    console.log('--------------------------------------------');
});
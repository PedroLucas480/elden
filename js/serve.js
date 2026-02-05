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
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Servindo arquivos estáticos
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/imagens', express.static(path.join(__dirname, '../imagens')));
app.use('/index', express.static(path.join(__dirname, '../index')));

// --- ROTA RAIZ ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index/index.html'));
});

// --- ROTA DE CADASTRO ---
app.post('/api/register', async (req, res) => {
    const { username, email, senha } = req.body;
    if (!username || !email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos!" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const query = 'INSERT INTO usuarios (username, email, senha) VALUES (?, ?, ?)';
        
        db.query(query, [username, email, senhaHash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ erro: "Usuário ou email já existe!" });
                return res.status(500).json({ erro: "Erro no banco de dados." });
            }
            res.status(201).json({ mensagem: "Usuário criado com sucesso!" });
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// --- ROTA DE LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET || 'MINHA_CHAVE_SECRETA_123';

    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro no banco de dados" });
        if (results.length === 0) return res.status(401).json({ erro: "Usuário não encontrado" });

        const usuario = results[0];
        try {
            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (!senhaValida) return res.status(401).json({ erro: "Senha incorreta" });

            // CORREÇÃO: Removido o objeto extra que causava o erro 500
            const token = jwt.sign(
                { id: usuario.id, email: usuario.email }, 
                JWT_SECRET, 
                { expiresIn: '2h' }
            );

            return res.json({ 
                logado: true, 
                token: token,
                usuario: { email: usuario.email, username: usuario.username } 
            });
        } catch (error) {
            return res.status(500).json({ erro: "Erro na validação" });
        }
    });
});

// --- CRUD DE BUILDS ---
app.get('/api/builds', (req, res) => {
    db.query('SELECT * FROM builds', (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro ao buscar builds" });
        res.json(results);
    });
});

// ... (Restante das rotas GET por ID, PUT e DELETE mantidas)

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
});
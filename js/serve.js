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
            classe_inicial VARCHAR(50),
            arma_principal VARCHAR(100),
            localizacao_nome VARCHAR(100),
            localizacao_url VARCHAR(255),
            imagem_url VARCHAR(255),
            descricao TEXT,
            vigor INT DEFAULT 0,
            mente INT DEFAULT 0,
            resistencia INT DEFAULT 0,
            forca INT DEFAULT 0,
            destreza INT DEFAULT 0,
            inteligencia INT DEFAULT 0,
            fe INT DEFAULT 0,
            arcano INT DEFAULT 0,
            dificuldade VARCHAR(20),
            usuario_id INT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );`;

    db.query(sqlUsuarios, (err) => {
        if (err) {
            console.error("❌ ERRO NO BANCO (Usuarios):", err.message);
            return;
        }

        db.query(sqlBuilds, (err) => {
            if (err) {
                console.error("❌ ERRO NO BANCO (Builds):", err.message);
                return;
            }
            console.log("✅ Banco inicializado com sucesso!");
        });
    });
};

// --- CONFIGURAÇÕES ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- ARQUIVOS ESTÁTICOS (Necessário para o CSS/Imagens carregarem) ---
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/imagens', express.static(path.join(__dirname, 'imagens')));

// --- BUILDS (LISTA COMPLETA) ---
app.get('/api/builds', (req, res) => {
    db.query('SELECT * FROM builds', (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro ao buscar builds" });
        res.json(results);
    });
});

// --- BUSCAR UMA BUILD ESPECÍFICA PELO ID ---
app.get('/api/builds/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM builds WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error("Erro no banco:", err);
            return res.status(500).json({ erro: "Erro ao buscar detalhes da build" });
        }
        if (results.length === 0) {
            return res.status(404).json({ erro: "Build não encontrada" });
        }
        res.json(results[0]);
    });
});

// --- CADASTRO ---
app.post('/api/register', async (req, res) => {
    const { username, email, senha } = req.body;
    if (!username || !email || !senha) return res.status(400).json({ erro: "Preencha todos os campos!" });

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        db.query(
            'INSERT INTO usuarios (username, email, senha) VALUES (?, ?, ?)',
            [username, email, senhaHash],
            (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ erro: "Usuário ou email já existe!" });
                    return res.status(500).json({ erro: "Erro no banco de dados." });
                }
                res.status(201).json({ mensagem: "Usuário criado com sucesso!" });
            }
        );
    } catch (e) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// --- LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET || 'chave_mestra_elden_123';

    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro no banco de dados" });
        if (results.length === 0) return res.status(401).json({ erro: "Usuário não encontrado" });

        const usuario = results[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(401).json({ erro: "Senha incorreta" });

        const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ 
            logado: true, 
            token, 
            usuario: { email: usuario.email, username: usuario.username } 
        });
    });
});

// --- START ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
    inicializarBanco();
});
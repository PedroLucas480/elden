const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// --- INICIALIZAÇÃO DO BANCO DE DADOS ---
const inicializarBanco = () => {
    const sqlUsuarios = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            senha VARCHAR(255) NOT NULL,
            foto_url LONGTEXT,
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
            video_url VARCHAR(255),
            itens_vitrine TEXT,
            usuario_id INT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
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

// Limite de 10mb mantido para suportar as fotos em Base64 do perfil
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- ARQUIVOS ESTÁTICOS ---
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/imagens', express.static(path.join(__dirname, 'imagens')));

// --- ROTA: SCRAPER (VISTORIA) ---
app.get('/api/scrape-eip', async (req, res) => {
    const { url } = req.query;
    if (!url || !url.includes('eip.gg')) {
        return res.status(400).json({ erro: "Link inválido." });
    }
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let itensEncontrados = [];
        $('.wp-block-eip-ring-db-item-link, a[href*="/elden-ring/db/"]').each((i, el) => {
            const nome = $(el).text().trim();
            if (nome && !itensEncontrados.includes(nome)) {
                itensEncontrados.push(nome);
            }
        });
        res.json({ sucesso: true, itens: itensEncontrados.slice(0, 12) });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao vistoriar o site parceiro." });
    }
});

// --- LISTAR BUILDS ---
app.get('/api/builds', (req, res) => {
    db.query('SELECT * FROM builds ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro ao buscar builds" });
        res.json(results);
    });
});

// --- BUSCAR BUILD POR ID ---
app.get('/api/builds/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM builds WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ erro: "Erro ao buscar build" });
        if (results.length === 0) return res.status(404).json({ erro: "Build não encontrada" });
        res.json(results[0]);
    });
});

// --- CADASTRO ---
app.post('/api/register', async (req, res) => {
    const { username, email, senha } = req.body;
    if (!username || !email || !senha) return res.status(400).json({ erro: "Campos obrigatórios faltando!" });
    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        db.query('INSERT INTO usuarios (username, email, senha) VALUES (?, ?, ?)', 
        [username, email, senhaHash], (err) => {
            if (err) return res.status(400).json({ erro: "Usuário ou email já existe!" });
            res.status(201).json({ mensagem: "Sucesso!" });
        });
    } catch (e) {
        res.status(500).json({ erro: "Erro interno." });
    }
});

// --- LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET || 'chave_mestra_elden_123';
    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ erro: "Credenciais inválidas" });
        const usuario = results[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(401).json({ erro: "Senha incorreta" });
        const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ 
            logado: true, 
            token, 
            usuario: { 
                id: usuario.id, // Adicionado ID para facilitar buscas
                email: usuario.email, 
                username: usuario.username, 
                foto: usuario.foto_url 
            } 
        });
    });
});

// --- ATUALIZAÇÃO DE PERFIL ---
app.put('/api/usuario/update', (req, res) => {
    const { username, foto, email } = req.body;
    db.query('UPDATE usuarios SET username = ?, foto_url = ? WHERE email = ?',
        [username, foto, email], (err) => {
            if (err) return res.status(500).json({ erro: "Erro ao atualizar" });
            res.json({ mensagem: "Perfil atualizado!" });
        }
    );
});

// --- CRIAR BUILD ---
app.post('/api/builds', (req, res) => {
    const { nome, arma_principal, descricao, vigor, forca, mente, destreza, email } = req.body;
    
    // Verificação básica para não inserir dados vazios por engano
    if (!email) return res.status(400).json({ erro: "E-mail do usuário é obrigatório." });

    const query = `INSERT INTO builds (nome, arma_principal, descricao, vigor, forca, mente, destreza, usuario_id) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT id FROM usuarios WHERE email = ? LIMIT 1))`;
    
    db.query(query, [nome, arma_principal, descricao, vigor || 0, forca || 0, mente || 0, destreza || 0, email], (err, result) => {
        if (err) {
            console.error("Erro ao criar build:", err);
            return res.status(500).json({ erro: "Erro ao salvar no banco." });
        }
        res.status(201).json({ mensagem: "Build criada com sucesso!" });
    });
});

// --- START ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
    inicializarBanco();
});
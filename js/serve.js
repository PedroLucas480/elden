const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db'); // Importa a conexão com o banco elden-ring
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// --- CONFIGURAÇÕES ESSENCIAIS ---
app.use(cors());
app.use(express.json());

// Libera o acesso às pastas para o navegador
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/imagens', express.static(path.join(__dirname, '../imagens')));
app.use('/index', express.static(path.join(__dirname, '../index')));

// --- ROTA DE CADASTRO (Atualizada com Username) ---
app.post('/api/register', async (req, res) => {
    const { username, email, senha } = req.body;

    if (!username || !email || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos (Nome, Email e Senha)!" });
    }

    try {
        // Criptografa a senha (bcrypt gera um hash de 60 caracteres)
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // A Query agora inclui o campo 'username' para bater com seu banco de dados
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

// --- ROTAS DE BUILDS (Mantidas) ---
app.get('/api/builds', (req, res) => {
    db.query('SELECT * FROM builds', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.get('/api/builds/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM builds WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ mensagem: "Build não encontrada" });
        res.json(result[0]);
    });
});

// --- INICIALIZAÇÃO ---
app.listen(3000, () => {
    console.log('--------------------------------------------');
    console.log('🔥 Servidor Elden Builds rodando na porta 3000');
    console.log('🔗 Link: http://localhost:3000/index/index.html');
    console.log('--------------------------------------------');
});
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const session = require('express-session');
const nodemailer = require('nodemailer');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.use(session({
    secret: 'elite-secret-2026',
    resave: false,
    saveUninitialized: true
}));

// ===== "BASE DE DADOS" =====
const dados = new Map();

// ===== ADMIN =====
const ADMIN = {
    user: 'elite',
    pass: '123456'
};

// ===== EMAIL (CONFIGURA AQUI) =====
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'SEU_EMAIL@gmail.com',
        pass: 'SENHA_DE_APP'
    }
});

// ===== FUNÇÕES =====
function gerarCodigo(desconto) {
    const r = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ELITE-${desconto}OFF-${r}`;
}

function getIP(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

function enviarEmail(ip, desconto, codigo) {
    transporter.sendMail({
        from: 'Sistema Elite',
        to: 'SEU_EMAIL@gmail.com',
        subject: 'Novo cupão gerado',
        text: `IP: ${ip}\nDesconto: ${desconto}%\nCódigo: ${codigo}`
    });
}

// ===== SITE =====
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head>
    <title>Elite Assistência</title>
    <style>
        body {
            font-family: Arial;
            text-align: center;
            background: url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d') no-repeat center;
            background-size: cover;
            color: white;
        }
        .box {
            margin-top: 100px;
            background: rgba(0,0,0,0.6);
            padding: 20px;
            display: inline-block;
            border-radius: 15px;
        }
        button {
            padding: 15px;
            font-size: 18px;
            background: gold;
            border: none;
            cursor: pointer;
        }
    </style>
    </head>
    <body>
        <div class="box">
            <h1>Elite Assistência</h1>
            <p>Clica para ganhar teu desconto</p>
            <button onclick="girar()">GIRAR CUPÃO</button>
            <p id="resultado"></p>
        </div>

        <script>
        async function girar() {
            const r = await fetch('/spin', { method: 'POST' });
            const data = await r.json();
            document.getElementById('resultado').innerHTML =
                'Desconto: ' + data.desconto + '%<br>Código: ' + data.codigo;
        }
        </script>
    </body>
    </html>
    `);
});

// ===== LOGIN =====
app.post('/login', (req, res) => {
    const { user, pass } = req.body;

    if (user === ADMIN.user && pass === ADMIN.pass) {
        req.session.auth = true;
        return res.json({ ok: true });
    }

    res.status(401).json({ ok: false });
});

// ===== SPIN =====
app.post('/spin', (req, res) => {
    const ip = getIP(req);

    const existente = dados.get(ip);

    if (existente) {
        const exp = Date.now() - existente.time > 86400000;
        if (!exp) {
            return res.status(403).json(existente);
        }
    }

    const desconto = Math.floor(Math.random() * 13) + 3;
    const codigo = gerarCodigo(desconto);

    dados.set(ip, {
        ip,
        desconto,
        codigo,
        usado: false,
        time: Date.now()
    });

    enviarEmail(ip, desconto, codigo);

    res.json({ desconto, codigo });
});

// ===== PAINEL =====
app.get('/painel', (req, res) => {
    if (!req.session.auth) {
        return res.send('Acesso negado');
    }

    let lista = '';
    for (const d of dados.values()) {
        lista += `<p>${d.ip} | ${d.desconto}% | ${d.codigo}</p>`;
    }

    res.send(`
        <h1>Painel da Empresa</h1>
        ${lista}
    `);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Sistema Elite ativo'));

require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

// Variáveis de ambiente
const ORIGEM = 'OPO';
const DESTINO = 'GRU';
const VALOR_ALVO = 1000;
const NUM_DIAS = 1;
const API_KEY = process.env.RAPIDAPI_KEY;
const EMAIL = process.env.EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Gera datas futuras
function gerarDatasFuturas(numDias) {
    const datas = [];
    const hoje = new Date();
    for (let i = 0; i < numDias; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() + i);
        datas.push(data.toISOString().split('T')[0]); // formato YYYY-MM-DD
    }
    return datas;
}

// Consulta o preço com Compare Flight Prices API
async function buscarPreco(dataIso) {
    try {
        const res = await axios.get(
            'https://compare-flight-prices.p.rapidapi.com/GetPricesAPI/GetPrices.aspx',
            {
                params: {
                    cabinClass: 'ECONOMY',
                    currency: 'EUR',
                    departureAirport: ORIGEM,
                    destinationAirport: DESTINO,
                    departureDate: dataIso,
                    returnDate: '',
                    adults: '1',
                },
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': 'compare-flight-prices.p.rapidapi.com',
                },
            }
        );

        const preco = res.data?.data?.[0]?.price ?? null;

        console.log(`${dataIso} → €${preco ?? 'N/A'}`);

        if (preco && preco <= VALOR_ALVO) {
            await enviarEmail(dataIso, preco);
            return true;
        }
    } catch (err) {
        console.log(`Erro em ${dataIso}: ${err.message}`);
    }
    return false;
}

// Envia e-mail
async function enviarEmail(dataIso, preco) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
        from: EMAIL,
        to: 'grasielamullermuller@gmail.com',
        subject: `🎯 Achamos passagem meu amooorr. VEM ME VER!! €${preco} - ${dataIso}`,
        text: `Tem uma passagem Porto → Guarulhos por €${preco} em ${dataIso}!\n\nCorre pro comparador e aproveite!`,
    });

    console.log('✅ E-mail enviado!');
}

// Roda verificação (sem repetir)
async function varrerDatas() {
    const datas = gerarDatasFuturas(NUM_DIAS);
    for (let dataIso of datas) {
        const enviado = await buscarPreco(dataIso);
        if (enviado) break;
    }
}

varrerDatas();

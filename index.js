// index.js
require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

// Variáveis de ambiente
const ORIGEM = 'OPO'; // Porto
const DESTINO = 'GRU'; // Guarulhos
const VALOR_ALVO = 1000;
const NUM_DIAS = 3; // Verifica só 3 datas por execução
const API_KEY = process.env.RAPIDAPI_KEY;
const EMAIL = process.env.EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Gera as datas futuras (ex: hoje, amanhã, depois)
function gerarDatasFuturas(numDias) {
    const datas = [];
    const hoje = new Date();
    for (let i = 0; i < numDias; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() + i);
        datas.push({
            year: data.getFullYear(),
            month: data.getMonth() + 1,
            day: data.getDate(),
        });
    }
    return datas;
}

// Busca o menor preço para uma data
async function buscarPreco(data) {
    try {
        const createRes = await axios.post(
            'https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/create',
            {
                query: {
                    market: 'PT',
                    locale: 'pt-PT',
                    currency: 'EUR',
                    queryLegs: [
                        {
                            originPlace: { queryPlace: { iata: ORIGEM } },
                            destinationPlace: { queryPlace: { iata: DESTINO } },
                            date: data,
                        },
                    ],
                    adults: 1,
                    cabinClass: 'CABIN_CLASS_ECONOMY',
                },
            },
            {
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': 'skyscanner44.p.rapidapi.com',
                },
            }
        );

        const token = createRes.data.sessionToken;

        const pollRes = await axios.post(
            `https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/poll/${token}`,
            {},
            {
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': 'skyscanner44.p.rapidapi.com',
                },
            }
        );

        const quotes = pollRes.data.content.results.quotes;
        if (!quotes || quotes.length === 0) return;

        const precoMinimo = Math.min(...quotes.map((q) => q.minPrice.amount));
        console.log(`${data.day}/${data.month}/${data.year} → €${precoMinimo}`);

        if (precoMinimo <= VALOR_ALVO) {
            await enviarEmail(data, precoMinimo);
        }
    } catch (err) {
        console.log(`Erro em ${data.day}/${data.month}: ${err.message}`);
    }
}

// Envia e-mail quando o preço for bom
async function enviarEmail(data, preco) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL,
            pass: EMAIL_PASS,
        },
    });

    const info = await transporter.sendMail({
        from: EMAIL,
        to: 'grasielamullermuller@gmail.com',
        subject: `🎯 Achamos passagem meu amooorr. VEM ME VER €${preco} - ${data.day}/${data.month}`,
        text: `Tem uma passagem Porto → Guarulhos por €${preco} em ${data.day}/${data.month}/${data.year}!\n\nAcesse o Skyscanner e aproveite.`,
    });

    console.log('✅ E-mail enviado!');
}

// Roda busca completa
async function varrerDatas() {
    const datas = gerarDatasFuturas(NUM_DIAS);
    for (let data of datas) {
        await buscarPreco(data);
    }
}

// Executa agora e a cada 24h
varrerDatas();
setInterval(varrerDatas, 24 * 60 * 60 * 1000);

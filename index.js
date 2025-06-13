require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

// Environment variables
const ORIGIN = 'OPO';
const DESTINATION = 'GRU';
const ORIGEM_NAME = 'porto-portugal';
const DESTINO_NAME = 'sao-paulo-state-of-sao-paulo-brazil';
const TARGET_PRICE = 500;
const NUM_DAYS = 10; // how many days to check (after offset)
const OFFSET_DAYS = 60; // start search X days in the future (2 months)
const API_KEY = process.env.RAPIDAPI_KEY;
const EMAIL = process.env.EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Generate future dates in format YYYY-MM-DD, starting OFFSET_DAYS ahead
function generateFutureDates(numDays, offsetDays = OFFSET_DAYS) {
    const dates = [];
    const today = new Date();
    today.setDate(today.getDate() + offsetDays);

    for (let i = 0; i < numDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
}

// Check price for a specific date using Kiwi API
async function checkPrice(dateIso) {
    try {
        const res = await axios.get(
            'https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip',
            {
                params: {
                    source: ORIGIN,
                    destination: DESTINATION,
                    dateFrom: dateIso,
                    dateTo: dateIso,
                    currency: 'eur',
                    adults: 1,
                    sortBy: 'PRICE',
                    cabinClass: 'ECONOMY',
                    limit: 1,
                },
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': 'kiwi-com-cheap-flights.p.rapidapi.com',
                },
            }
        );

        const price = res.data?.itineraries?.[0]?.price?.amount ?? null;
        console.log(`${dateIso} → €${price ?? 'N/A'}`);

        if (price && price <= TARGET_PRICE) {
            await sendEmail(dateIso, price);
            return true;
        }
    } catch (err) {
        console.log(`Error on ${dateIso}: ${err.message}`);
    }
    return false;
}

// Send email if cheap flight is found
async function sendEmail(dateIso, price) {
    // Add 7 days to outbound date to simulate return
    const returnDate = new Date(dateIso);
    returnDate.setDate(returnDate.getDate() + 7);
    const returnIso = returnDate.toISOString().split('T')[0];

    const link = `https://www.kiwi.com/en/search/results/${ORIGEM_NAME}/${DESTINO_NAME}/${dateIso}/${returnIso}?sortBy=price`;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
        from: EMAIL,
        to: 'dri.latorre@gmail.com ',
        subject: `🎯 Achamos passagem meu amooorr. VEM ME VER!! €${price} - ${dateIso}`,
        text: `EU AMO VOCÊ COISA MAR LINDA DESSE MUNDÃO!!\n\n Tem uma passagem Porto → Guarulhos por €${price} em ${dateIso}!\n\nVeja aqui direto no site da Kiwi:\n${link}\n\nCorre pro comparador e aproveite!`,
    });

    console.log('✅ Email sent!');
}

// Scan all dates and stop if a flight meets the price target
async function scanDates() {
    const dates = generateFutureDates(NUM_DAYS);
    for (let dateIso of dates) {
        const sent = await checkPrice(dateIso);
        if (sent) break;
    }
}

// Initial run
scanDates();

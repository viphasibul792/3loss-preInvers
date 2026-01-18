const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// টোকেনটি অবশ্যই নতুন করে নিয়ে এখানে বসাবেন
const token = "8555971778:AAFfHnnuRaSGhBAykQk_gpuymAafHPcxK38"; 
const chatId = "@PdBot017"; 

// পোলিং অপশন উন্নত করা হয়েছে যাতে কনফ্লিক্ট কম হয়
const bot = new TelegramBot(token, { 
    polling: {
        autoStart: true,
        params: {
            timeout: 10
        }
    } 
});

// এরর হ্যান্ডলিং যোগ করা হয়েছে যাতে বট বন্ধ না হয়ে যায়
bot.on('polling_error', (error) => {
    console.log(`[Polling Error]: ${error.message}`);
});

const winStickerId = "CAACAgUAAxkBAAEQPxhpaN8xti9Ug8pzCuTOIKSMudQ2OAAC4xkAAi_xcVX60TxI2of6nDgE"; 
const seasonStartStickerId = "CAACAgUAAxkBAAEQQPppakFbk3fqeWzooRLIx3RKgAHIrwACUhYAAlEJ-VVZvLkjcrQPSTgE";
const seasonEndStickerId = "CAACAgUAAxkBAAEQQPxpakFtr-vvDe05t6M7KXqUvc6xEQACIhYAAi3U8FUVaqmrOChRqDgE";

// Render এর জন্য পোর্ট বাইন্ডিং
http.createServer((req, res) => {
  res.write('Bot is Running');
  res.end();
}).listen(process.env.PORT || 3000);

const HISTORY_API = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json';
const chartData = { "0/1":"BIG", "1/1":"SMALL", "2/1":"BIG", "3/1":"BIG", "4/1":"BIG", "5/1":"BIG", "6/1":"SMALL", "7/1":"BIG", "8/1":"SMALL", "9/1":"SMALL", "0/2":"SMALL", "1/2":"SMALL", "2/2":"BIG", "3/2":"BIG", "4/2":"BIG", "5/2":"SMALL", "6/2":"SMALL", "7/2":"BIG", "8/2":"BIG", "9/2":"SMALL", "0/3":"BIG", "1/3":"SMALL", "2/3":"BIG", "3/3":"BIG", "4/3":"BIG", "5/3":"SMALL", "6/3":"BIG", "7/3":"SMALL", "8/3":"BIG", "9/3":"BIG", "0/4":"SMALL", "1/4":"BIG", "2/4":"SMALL", "3/4":"SMALL", "4/4":"SMALL", "5/4":"BIG", "6/4":"SMALL", "7/4":"SMALL", "8/4":"BIG", "9/4":"BIG", "0/5":"SMALL", "1/5":"SMALL", "2/5":"BIG", "3/5":"SMALL", "4/5":"BIG", "5/5":"SMALL", "6/5":"BIG", "7/5":"BIG", "8/5":"BIG", "9/5":"BIG", "0/6":"BIG", "1/6":"BIG", "2/6":"SMALL", "3/6":"SMALL", "4/6":"SMALL", "5/6":"SMALL", "6/6":"BIG", "7/6":"BIG", "8/6":"SMALL", "9/6":"BIG", "0/7":"SMALL", "1/7":"BIG", "2/7":"BIG", "3/7":"BIG", "4/7":"BIG", "5/7":"SMALL", "6/7":"SMALL", "7/7":"BIG", "8/7":"BIG", "9/7":"SMALL", "0/8":"SMALL", "1/8":"SMALL", "2/8":"SMALL", "3/8":"SMALL", "4/8":"SMALL", "5/8":"BIG", "6/8":"SMALL", "7/8":"SMALL", "8/8":"BIG", "9/8":"BIG", "0/9":"BIG", "1/9":"SMALL", "2/9":"SMALL", "3/9":"SMALL", "4/9":"SMALL", "5/9":"BIG", "6/9":"SMALL", "7/9":"SMALL", "8/9":"SMALL", "9/9":"SMALL", "0/0":"BIG", "1/0":"BIG", "2/0":"SMALL", "3/0":"BIG", "4/0":"BIG", "5/0":"SMALL", "6/0":"BIG", "7/0":"BIG", "8/0":"SMALL", "9/0":"SMALL" };

let isRunning = false;
let sessionResults = [];
let totalWinCount = 0;
let currentStep = 1;
let lastAnalyzedPeriod = "";
let lossStreak = 0;

function generatePeriod() {
    const now = new Date();
    const datePrefix = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    return datePrefix + "1000" + String(10001 + totalMinutes);
}

// নিরাপদ মেসেজ পাঠানোর ফাংশন
async function safeSend(chat, content, isSticker = false) {
    try {
        if (isSticker) {
            await bot.sendSticker(chat, content);
        } else {
            await bot.sendMessage(chat, content, { parse_mode: 'Markdown' });
        }
    } catch (err) {
        console.log(`[Send Error]: ${err.message}`);
    }
}

async function checkAndPredict() {
    if (!isRunning) return;

    try {
        const response = await axios.get(`${HISTORY_API}?pageSize=10&pageNo=1&type=1`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const apiList = response.data.data.list;
        const currentPeriod = generatePeriod();

        if (sessionResults.length > 0) {
            let lastEntry = sessionResults[sessionResults.length - 1];
            if (lastEntry.status === "Pending") {
                const match = apiList.find(h => h.issueNumber === lastEntry.period);
                if (match) {
                    const actual = parseInt(match.number) >= 5 ? "BIG" : "SMALL";
                    if (lastEntry.prediction === actual) {
                        lastEntry.status = "WIN";
                        totalWinCount++;
                        currentStep = 1;
                        lossStreak = 0; // উইন হলে লস স্ট্রিক রিসেট
                        await safeSend(chatId, `🚀 RESULT: ${match.issueNumber.slice(-3)} WIN ✅✅✅✅`);
                        await safeSend(chatId, winStickerId, true); 
                    } else {
                        lastEntry.status = "LOSS";
                        lossStreak++; // লস হলে স্ট্রিক বাড়বে
                        currentStep = currentStep < 10 ? currentStep + 1 : 1;
                    }

                    if (totalWinCount >= 20) {
                        isRunning = false;
                        await safeSend(chatId, seasonEndStickerId, true);
                    }
                }
            }
        }

        const seconds = new Date().getUTCSeconds();
        if (currentPeriod !== lastAnalyzedPeriod && seconds >= 10 && seconds <= 15) {
            lastAnalyzedPeriod = currentPeriod;
            
            const lastFive = apiList.slice(0, 5).map(item => parseInt(item.number) >= 5 ? "BIG" : "SMALL");
            
            let prediction = "";
            if (lastFive.every(v => v === "BIG")) prediction = "BIG";
            else if (lastFive.every(v => v === "SMALL")) prediction = "SMALL";
            else {
                const n1 = parseInt(apiList[0].number);
                const n2 = parseInt(apiList[1].number);
                prediction = chartData[`${n1}/${n2}`] || "BIG";
            }

            // --- নতুন লজিক: ৪টি লস হলে পরবর্তীটি বিপরীত হবে ---
            if (lossStreak === 4) {
                prediction = (prediction === "BIG") ? "SMALL" : "BIG";
                lossStreak = 0; // বিপরীত প্রেডিকশন দেওয়ার পর স্ট্রিক রিসেট
            }
            // ----------------------------------------------

            sessionResults.push({ period: currentPeriod, prediction: prediction, status: "Pending" });
            
            let msg = `🎖️ 𝕎𝕀ℕ𝔾𝕆 𝟙𝕄𝕀ℕ 🎖️\n\n🔰 🅿🅳: ${currentPeriod}\n\n🎯 𝐏𝐑𝐄𝐃: *${prediction}* 🎯`;
            await safeSend(chatId, msg);
        }
    } catch (error) {
        console.log("History API Error:", error.message);
    }
}

bot.onText(/\/prediction/, async (msg) => {
    if (isRunning) return;
    isRunning = true;
    totalWinCount = 0;
    sessionResults = [];
    currentStep = 1;
    lossStreak = 0;
    
    await safeSend(chatId, seasonStartStickerId, true);
    bot.sendMessage(msg.chat.id, "✅ Prediction Started!");
});

bot.onText(/\/close/, async (msg) => {
    isRunning = false;
    bot.sendMessage(msg.chat.id, "❌ Stopped Manually.");
});

setInterval(checkAndPredict, 4000);

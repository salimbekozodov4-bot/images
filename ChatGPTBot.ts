/**
 * ChatGPT Bot Example for Nexus Messenger
 * 
 * Bu bot OpenAI API orqali foydalanuvchilar bilan muloqot qiladi.
 * Kontekstni (xabarlar tarixini) saqlash imkoniyatiga ega.
 * 
 * ⚙️ .env fayliga qo'shish:
 * VITE_BOT_TOKEN=h4cHPlTjZpM7m.OEY20Q95IFrUlWyKrko
 * VITE_OPENAI_API_KEY=sk-proj-YOUR_NEW_API_KEY_HERE
 */

// 1. Bot sozlamalari
const BOT_TOKEN =  "h4cHPlTjZpM7m.OEY20Q95IFrUlWyKrko";
const OPENAI_API_KEY = "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";

// 2. Botni ro'yxatdan o'tkazish
registerBot(BOT_TOKEN, async (message, userId, user) => {
    // Buyruqlarni tekshirish
    if (message.toLowerCase() === '/clear') {
        await storage.delete(`history_${userId}`);
        return { text: "♻️ Suhbat tarixi tozalandi. Yangi suhbatni boshlashingiz mumkin!" };
    }

    if (message.toLowerCase() === '/start') {
        return {
            text: `Salom **${user.name}**! 👋\n\nMen ChatGPT botman. Menga xohlagan savolingizni berishingiz mumkin.\n\n📚 **Buyruqlar:**\n/clear - Suhbat tarixini tozalash\n/help - Yordam`,
            actions: [
                { label: "Savol berish", action: "Qandaysiz?" },
                { label: "Tarixni tozalash", action: "/clear" }
            ]
        };
    }

    try {
        // API Key tekshiruvi
        if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith("sk-")) {
            return { text: "⚠️ Xatolik: OpenAI API Kaliti noto'g'ri o'rnatilgan.\n\n🔧 .env fayliga qo'shish:\nVITE_OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY\n\nhttps://platform.openai.com/api-keys da yangi key oling." };
        }

        // Suhbat tarixini yuklash (kontekst uchun)
        let history = await storage.get(`history_${userId}`) || [];

        // Yangi xabarni qo'shish
        history.push({ role: "user", content: message });

        // Faqat oxirgi 15 ta xabarni yuboramiz (token tejash va limit uchun)
        const contextMessages = history.slice(-15);

        // OpenAI ga so'rov yuborish
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Siz Nexus Messenger ichidagi aqlli va foydali yordamchisiz. Ismingiz ChatGPT. Foydalanuvchilarga o'zbek tilida, do'stona va aniq javob bering. Qisqa va tushunarli javoblar ber."
                    },
                    ...contextMessages
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenAI API Error:", errorData);
            
            const errorMessage = errorData.error?.message || "Noma'lum xatolik";
            
            // Agar API key xato bo'lsa:
            if (errorMessage.includes("invalid_api_key") || errorMessage.includes("Invalid API key")) {
                return { text: "🔑 Xatolik: API Kaliti noto'g'ri yoki muddati tugagan.\n\nYangi key oling: https://platform.openai.com/api-keys" };
            }
            
            // Agar quota tugagan bo'lsa:
            if (errorMessage.includes("quota") || errorMessage.includes("exceeded")) {
                return { text: "💰 Xatolik: OpenAI kredit tugagan. Akkauntga pul qo'shib qo'ying." };
            }
            
            return { text: `❌ OpenAI Xatolik: ${errorMessage}` };
        }

        const data = await response.json();
        const aiReply = data.choices?.[0]?.message?.content || "Javob olib kelish imkonsiz bo'ldi.";

        // Javobni tarixga saqlash
        history.push({ role: "assistant", content: aiReply });
        await storage.set(`history_${userId}`, history);

        return {
            text: aiReply,
            actions: [
                { label: "Tarixni tozalash 🗑️", action: "/clear" }
            ]
        };

    } catch (err) {
        console.error("Bot Handler Error:", err);
        return { text: `⚠️ Xatolik: ${err?.message || "Noma'lum xatolik yuz berdi"}` };
    }
});

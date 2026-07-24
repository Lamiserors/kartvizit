// configs/db.js
const { Sequelize } = require('sequelize');

// MÜHENDİSLİK DOKUNUŞU: Eğer bulut ortamındaysak DATABASE_URL'i kullan, lokaldeysek kendi bilgisayarımızı bağla
const sequelize = process.env.DATABASE_URL 
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Neon.tech güvenliği için bu sertifika ayarı şarttır
            }
        }
      })
    : new Sequelize('kartvizit_db', 'postgres', '123456', { // Kendi yerel veritabanı adın ve şifren
        host: 'localhost',
        dialect: 'postgres',
        logging: false
      });

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('=> PostgreSQL Bağlantısı Başarılı! 😎');
    } catch (error) {
        console.error('!!! PostgreSQL Bağlantı Hatası:', error.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
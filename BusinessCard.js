// models/BusinessCard.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../configs/db');

// Kartvizit Tablo Şeması Tasarımı
const BusinessCard = sequelize.define('BusinessCard', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Her kayıtta otomatik 1, 2, 3 diye artar
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false, // AKADEMİK İLİŞKİ: Her kartvizit mutlaka bir kullanıcıya ait olmalı
        references: {
            model: 'users', // 'users' tablosuna referans veriyoruz
            key: 'id'
        }
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Frontend'in ürettiği benzersiz zaman damgası (Timestamp) için
    },
    ad_soyad: {
        type: DataTypes.STRING,
        allowNull: false // En azından bir ad soyad zorunlu olsun
    },
    unvan: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sirket: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telefon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true
    },
    adres: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    notlar: {
        type: DataTypes.TEXT,
        allowNull: true // Kullanıcının elle gireceği notlar alanı
    },
    qr_veri: {
        type: DataTypes.TEXT,
        allowNull: true // Eğer kartvizitte QR kod varsa içeriği buraya yazılacak
    }
}, {
    tableName: 'business_cards', // Veritabanındaki gerçek tablo adı
    timestamps: true // Bu sayede createdAt (eklenme) ve updatedAt (güncellenme) tarihleri otomatik tutulur
});

module.exports = BusinessCard;
// public/app.js
import CardModel from './js/models/CardModel.js';
import CardView from './js/views/CardView.js';
import CardController from './js/controllers/CardController.js';

// Uygulamayı (MVC) Ayağa Kaldırıyoruz
const app = new CardController(new CardModel(), new CardView());
app.init();
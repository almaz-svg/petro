// Редакционные тексты стартовой страницы. Здесь нет неподтверждённых дат, адресов или расписаний.
export const content = {
  eyebrow: "МЕЧЕТЬ · ПЕТРОПАВЛ",
  title: "МЕСТО,\nКОТОРОЕ\nОБЪЕДИНЯЕТ.",
  heroDescription:
    "Свет, пропорции и детали. Откройте архитектуру мечети в движении.",
  architectureTitle: "В КАЖДОЙ\nДЕТАЛИ —\nЦЕЛОЕ.",
  architectureDescription:
    "От силуэта минаретов до ритма окон — рассмотрите формы, которые складываются в единое пространство.",
  exploreDescription:
    "Поверните модель, приблизьте детали и найдите свой взгляд на архитектуру.",
};

export const assets = {
  model: "./mosque-360.glb",
  fallback: "./mosque-360.gif",
};

// Each image or video owns its caption. For video use type: "video", src and optional poster.
export const galleryMedia = [
  { type: "image", src: "./assets/images/hero-city.jpg", title: "ПЕРВОЕ\nВПЕЧАТЛЕНИЕ.", description: "Дорога, зелень и открытое небо. Город начинается со встречи.", alt: "Приветственная надпись на фоне леса и облачного неба", position: "50% 50%" },
  { type: "image", src: "./assets/images/arxetek.png", title: "ГОРОД\nВ СВЕТЕ.", description: "Вечерний свет объединяет улицы, площади и архитектуру в одну панораму.", alt: "Городская панорама с площадью в вечернем свете", position: "50% 50%" },
  { type: "image", src: "./assets/images/city-details.jpg", title: "ШИРЕ\nГОРИЗОНТА.", description: "Городской ритм на фоне горного пейзажа. Другой масштаб и другая перспектива.", alt: "Городские кварталы на фоне заснеженной горы", position: "50% 50%" },
];

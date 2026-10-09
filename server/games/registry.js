// This catalog must not import an engine: listing games stays cheap.
export const games = [{
  manifest: {
    id: 'prop-hunt', name: 'Nesne Avı', tagline: 'Gözünün önündeyim.',
    description: 'Bir nesneye dönüş, odaya karış. Arkadaşların seni bulmadan süreyi bitir.',
    category: 'Saklambaç', minPlayers: 2, maxPlayers: 24, duration: '3 dk',
    bots: true, input: 'Klavye + fare', status: 'available',
    entry: '/games/prop-hunt/', cover: '/games/prop-hunt/maps/references/loft.jpeg',
    namespace: '/games/prop-hunt', protocolVersion: 1,
  },
  load: () => import('./prop-hunt/adapter.js').then(module => module.adapter),
}, {
  manifest: {
    id: 'ates-koprusu', name: 'Ateş Köprüsü', tagline: 'Doğru tarafa koş.',
    description: 'Herkes aynı soruyu görür, şıklar herkeste başka yerde. Doğru bilen ilerler, yanlış bilene kütük çarpar.',
    category: 'Bilgi yarışması', minPlayers: 1, maxPlayers: 12, duration: 'Sonsuz akış',
    bots: false, input: 'Klavye, fare veya dokunmatik', status: 'available',
    entry: '/games/ates-koprusu/', cover: '/games/ates-koprusu/cover.svg',
    namespace: '/games/ates-koprusu', protocolVersion: 1,
  },
  load: () => import('./ates-koprusu/adapter.js').then(module => module.adapter),
}, {
  manifest: {
    id: 'snake', name: 'Yılan Meydanı', tagline: 'Kuyruğunu büyüt, meydanı kap.',
    description: 'Yılanını büyüt, güçlendiricileri topla ve arenada rakiplerine meydan oku.',
    category: 'Arcade', minPlayers: 1, maxPlayers: 12, duration: 'Sonsuz akış',
    bots: true, input: 'Klavye veya dokunmatik', status: 'available',
    entry: '/games/snake/', cover: '/games/snake/assets/cover.svg',
    namespace: '/games/snake', protocolVersion: 1,
  },
  load: () => import('./snake/adapter.js').then(module => module.adapter),
}, {
  manifest: {
    id: 'cengel-kapismasi', name: 'Çengel Kapışması', tagline: 'Beş harf. Tek tahta.',
    description: 'Elindeki harfleri ortak çengel tahtasına yerleştir. Kelimeleri tamamla, beş harfi bitir ve puanları topla.',
    category: 'Kelime oyunu', minPlayers: 1, maxPlayers: 12, duration: '2–10 dk',
    bots: true, input: 'Fare, klavye veya dokunmatik', status: 'available',
    entry: '/games/cengel-kapismasi/', cover: '/games/cengel-kapismasi/cover.webp',
    namespace: '/games/cengel-kapismasi', protocolVersion: 1,
  },
  load: () => import('./cengel-kapismasi/adapter.js').then(module => module.adapter),
}, {
  manifest: {
    id: 'blind-shot', name: 'Kör Atış', tagline: 'Görmeden seç. Tek atışta kal.',
    description: 'Rakiplerin gizliyken konumunu ve atış yönünü seç. Dörtgen, altıgen ve sekizgen siperli arenalarda alan daralırken eşzamanlı atışlarla puanları topla.',
    category: 'Strateji / Parti', minPlayers: 1, maxPlayers: 8, duration: '2–3 dk',
    bots: true, input: 'Fare, klavye veya dokunmatik', status: 'available',
    entry: '/games/blind-shot/', cover: '/games/blind-shot/cover.svg',
    namespace: '/games/blind-shot', protocolVersion: 1,
  },
  load: () => import('./blind-shot/adapter.js').then(module => module.adapter),
}];

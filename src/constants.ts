import { House } from './types';

export const HOUSES: House[] = [
  {
    id: 'domek-1',
    name: 'Antracytowy Domek 1',
    description: 'Nowoczesny domek w lesie, zaledwie 5 minut od plaży. Idealny na spokojny wypoczynek.',
    capacity: 8,
    priceBase: 650,
    amenities: [
      'Prywatna balia z jacuzzi',
      'Duży taras',
      'W pełni wyposażona kuchnia',
      'Darmowe WiFi',
      'Zwierzęta mile widziane',
      'Grill i palenisko'
    ],
    images: [
      'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&q=80&w=1200'
    ]
  },
  {
    id: 'domek-2',
    name: 'Antracytowy Domek 2',
    description: 'Drugi z naszych bliźniaczych domków na wspólnej działce. Komfort i natura w jednym.',
    capacity: 8,
    priceBase: 650,
    amenities: [
      'Prywatna balia z jacuzzi',
      'Zadaszona altana',
      'Kącik czytelniczy',
      'Sprzęt muzyczny',
      'Parking na posesji',
      'Brak opłat za psa'
    ],
    images: [
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1449156001935-d2470475700b?auto=format&fit=crop&q=80&w=1200'
    ]
  },
  {
    id: 'domek-3',
    name: 'Antracytowy Domek 3',
    description: 'Samodzielny domek na osobnej posesji, zapewniający maksimum prywatności.',
    capacity: 8,
    priceBase: 650,
    amenities: [
      'Prywatna balia z jacuzzi (drewno w cenie)',
      'Duży taras z meblami',
      'Miejsce na ognisko',
      'TV i WiFi',
      '2 sypialnie + salon',
      'Blisko plaży'
    ],
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1472224311443-94147661d40c?auto=format&fit=crop&q=80&w=1200'
    ]
  }
];

export interface Restaurant {
    id: number;
    name: string;
    lat: number;
    lng: number;
    rating: number;
    distance: string;
    cuisine: string;
}

export const RESTAURANTS: Restaurant[] = [
    {
        id: 1,
        name: 'Kabab House',
        lat: 23.7808,
        lng: 90.4067,
        rating: 4.5,
        distance: '0.3 km',
        cuisine: 'Pakistani',
    },
    {
        id: 2,
        name: 'Pizza Hut',
        lat: 23.7825,
        lng: 90.4085,
        rating: 4.2,
        distance: '0.5 km',
        cuisine: 'Italian',
    },
    {
        id: 3,
        name: 'Burger King',
        lat: 23.7790,
        lng: 90.4050,
        rating: 4.0,
        distance: '0.4 km',
        cuisine: 'American',
    },
    {
        id: 4,
        name: 'KFC',
        lat: 23.7850,
        lng: 90.4100,
        rating: 4.6,
        distance: '0.8 km',
        cuisine: 'Fast Food',
    },
    {
        id: 5,
        name: 'Dominos',
        lat: 23.7775,
        lng: 90.4030,
        rating: 4.3,
        distance: '0.6 km',
        cuisine: 'Pizza',
    },
    {
        id: 6,
        name: 'Chillox',
        lat: 23.7820,
        lng: 90.4120,
        rating: 4.4,
        distance: '0.7 km',
        cuisine: 'Chinese',
    },
    {
        id: 7,
        name: 'Kacchi Bhai',
        lat: 23.7795,
        lng: 90.4075,
        rating: 4.7,
        distance: '0.2 km',
        cuisine: 'Bangladeshi',
    },
    {
        id: 8,
        name: 'Thai Express',
        lat: 23.7835,
        lng: 90.4095,
        rating: 4.1,
        distance: '0.9 km',
        cuisine: 'Thai',
    },
];

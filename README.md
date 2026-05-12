## Project Info

- Developer: Topon Roy from Bangladesh
- Version: 1.0.0
- Platform: iOS & Android
# Dine-Five

Dine-Five is a mobile-first food ordering app built with Expo, React Native, and Expo Router. It brings together customer onboarding, authentication, nearby restaurant discovery, menu browsing, cart management, checkout, payment, notifications, and profile management in one app experience.

![Dine-Five preview](./assets/icon.png)
## Overview

This project focuses on the customer side of a complete food ordering flow. Users can sign up, verify their account, discover nearby restaurants using location data, explore restaurant and product details, manage a cart, complete checkout with Stripe, and review past orders from the profile section.

## Key Features

- Multi-step onboarding and splash experience
- Email/password authentication
- OTP email verification and forgot/reset password flow
- Google Sign-In for native builds
- Location-aware restaurant discovery
- Search, category filters, banners, and nearby restaurant sections
- Restaurant details, product details, favorites, and reviews
- Cart management with quantity updates and tax-aware checkout
- Stripe Payment Sheet integration
- Order creation, order history, and order success flow
- Profile management, support, and settings screens
- Local notification sync for in-app updates

## Tech Stack

- Expo 54
- React Native 0.81
- React 19
- Expo Router for file-based navigation
- TypeScript
- NativeWind and Tailwind CSS for styling
- Zustand with AsyncStorage for app state and persisted auth
- Expo Location, Notifications, Splash Screen, AV, Image Picker, and Web Browser
- Stripe React Native SDK
- Google Sign-In
- React Native Maps with web fallback support

## Project Structure

```text
app/                Route groups, screens, and navigation structure
components/         Reusable UI for auth, home, map, cart, and product flows
stores/             Zustand stores for auth, restaurants, cart, orders, and more
services/           Native and third-party integration helpers
hooks/              App-level hooks such as notification syncing
utils/              API utilities, storage helpers, and shared helpers
assets/             Icons, splash assets, screenshots, and images
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Android Studio and/or Xcode for native testing
- A working backend API that matches the endpoints used in `stores/stores.ts`

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend URL

Create a `.env` file in the project root and add:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:5000
```

Notes:

- If `EXPO_PUBLIC_API_URL` is not set, the app falls back to `http://localhost:5000`.
- The logic in `utils/api.ts` automatically adjusts localhost-style URLs for Android emulators and Expo LAN sessions when possible.
- On a physical device, use your machine's local network IP instead of `localhost`.

### 3. Start the project

```bash
npm run start
```

You can also run platform-specific commands:

```bash
npm run android
npm run ios
npm run web
```

## Native Build Notes

Some features rely on native modules and work best in a development build instead of a basic Expo Go session:

- Google Sign-In
- Stripe payments
- Maps and location permissions
- Notification permissions and delivery

For those flows, prefer:

```bash
npm run android
```

or

```bash
npm run ios
```

## Available Scripts

- `npm run start` - Start the Expo development server
- `npm run android` - Run the Android app
- `npm run ios` - Run the iOS app
- `npm run web` - Run the web build
- `npm run lint` - Run lint checks
- `npm run reset-project` - Reset the starter project files

## Backend Capabilities Expected

This frontend expects backend support for the following areas:

- Authentication and email verification
- User profile management
- Restaurant discovery and menu data
- Cart operations
- Orders and order history
- Reviews and favorites
- Notifications
- Stripe configuration and payment intents
- Support tickets

## Configuration Notes

- `app.json` includes native configuration for location, notifications, Stripe, and Google services.
- The current implementation includes Google Sign-In and Google Maps related native setup.
- Before a production release, move any sensitive keys and client IDs to secure environment-based configuration.

## Platform Notes

- The main target is mobile, even though web support is available for layout and flow testing.
- Google Sign-In is currently not available on web in this implementation.
- Some checkout data and payment method labels are still demo-style placeholders and should be finalized before production rollout.

## License

This project is private and is not currently licensed for public redistribution.

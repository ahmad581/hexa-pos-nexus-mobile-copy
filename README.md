# Hexa POS Nexus Mobile

A React Native mobile application for the Hexa POS system.

## Project Structure

```
hexa-pos-nexus-mobile/
├── src/
│   ├── screens/          # Screen components
│   ├── components/       # Reusable components
│   ├── navigation/       # Navigation setup
│   ├── services/         # API and business logic
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── hooks/            # Custom React hooks
│   └── App.tsx           # Main App component
├── android/              # Android native code
├── ios/                  # iOS native code
├── node_modules/         # Dependencies
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── babel.config.js       # Babel configuration
├── metro.config.js       # Metro bundler configuration
└── README.md            # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

### Running the App

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

#### Development Server
```bash
npm start
```

## Available Scripts

- `npm start` - Start the Metro bundler
- `npm run android` - Run the app on Android
- `npm run ios` - Run the app on iOS
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Technologies

- React Native
- TypeScript
- Jest
- React Navigation (to be added)

## License

MIT

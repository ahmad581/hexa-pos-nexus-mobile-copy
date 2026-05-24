import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootNavigator } from './navigation/RootNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <RootNavigator />
  );
}

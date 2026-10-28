import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileCache } from './cache';
export const mobileCache = new MobileCache(AsyncStorage);

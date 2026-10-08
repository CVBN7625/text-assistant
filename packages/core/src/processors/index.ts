import { TextProcessor } from '../types';
import { cleanupProcessors } from './cleanup';
import { conversionProcessors } from './conversion';
import { enhancementProcessors } from './enhancement';
import { translationProcessors } from './translation';

export { cleanupProcessors } from './cleanup';
export { conversionProcessors } from './conversion';
export { enhancementProcessors } from './enhancement';
export { translationProcessors } from './translation';

// 所有处理器
export const allProcessors: TextProcessor[] = [
  ...cleanupProcessors,
  ...conversionProcessors,
  ...enhancementProcessors,
  ...translationProcessors
];

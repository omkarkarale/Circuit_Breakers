import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Trigger mobile haptic vibration feedback with web developer fallback.
 */
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const impactStyle = 
      style === 'medium' ? ImpactStyle.Medium :
      style === 'heavy' ? ImpactStyle.Heavy :
      ImpactStyle.Light;
      
    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    // Fail-safe browser fallback
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        const duration = style === 'medium' ? 15 : style === 'heavy' ? 30 : 8;
        navigator.vibrate(duration);
      }
    } catch (_) {}
  }
}

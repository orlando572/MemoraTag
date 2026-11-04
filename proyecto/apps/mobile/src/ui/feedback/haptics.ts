import * as Haptics from 'expo-haptics';

// Haptics complement visual feedback; they never replace it and failures are ignored
// (unsupported devices, vibration disabled by the user).
function run(effect: () => Promise<void>) { void effect().catch(() => {}); }

export const haptic = {
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  tap: () => run(() => Haptics.selectionAsync()),
};

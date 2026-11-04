// Adds an NDEF_DISCOVERED intent filter so that tapping a MemoraTag tag opens the app
// even when it is closed. app.json "intentFilters" always prefixes actions with
// "android.intent.action.", which would produce an invalid NFC action.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

module.exports = function withNfcIntent(config) {
  return withAndroidManifest(config, (mod) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    const filters = activity['intent-filter'] ?? [];
    const action = 'android.nfc.action.NDEF_DISCOVERED';
    if (!filters.some((filter) => filter.action?.some((item) => item.$['android:name'] === action))) {
      filters.push({
        action: [{ $: { 'android:name': action } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:scheme': 'memoratag', 'android:host': 'objeto' } }],
      });
    }
    activity['intent-filter'] = filters;
    return mod;
  });
};

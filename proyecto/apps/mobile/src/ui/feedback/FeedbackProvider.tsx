import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, BackHandler, findNodeHandle, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../theme';
import { radius, space, type, type Palette } from '../tokens';
import { haptic } from './haptics';

type Action = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap };
type Request = { kind: 'dialog' | 'sheet'; title: string; message?: string; actions: Action[] };
type ToastOptions = {
  /** Optional action such as «Deshacer». */
  action?: { label: string; onPress: () => void };
  /** Called when the toast closes without its action being used (time out or replaced). */
  onExpire?: () => void;
  tone?: 'success' | 'info';
};
type Toast = { id: number; message: string } & ToastOptions;
type Feedback = {
  /** Neutral dialog; vibrates as a warning when it confirms a destructive action. */
  alert: (title: string, message?: string, actions?: Action[]) => void;
  /** Dialog for a failed operation; adds an error vibration. */
  error: (title: string, message?: string, actions?: Action[]) => void;
  sheet: (title: string, message?: string, actions?: Action[]) => void;
  /** Brief confirmation of a completed operation; adds a success vibration. */
  toast: (message: string, options?: ToastOptions) => void;
};
const Context = createContext<Feedback | null>(null);

export function useFeedback() {
  const value = useContext(Context);
  if (!value) throw new Error('FeedbackProvider is missing');
  return value;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const styles = useStyles(makeStyles);
  const [current, setCurrent] = useState<Request | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const active = useRef<Request | null>(null);
  const queue = useRef<Request[]>([]);
  const closing = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const toastProgress = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);
  const currentToast = useRef<Toast | null>(null);
  const announcedToast = useRef(0);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<Text>(null);
  const toastActionRef = useRef<View>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted.current) setReduceMotion(enabled); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const keyboardShown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardHidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { mounted.current = false; listener.remove(); keyboardShown.remove(); keyboardHidden.remove(); if (toastTimer.current) clearTimeout(toastTimer.current); if (focusTimer.current) clearTimeout(focusTimer.current); progress.stopAnimation(); toastProgress.stopAnimation(); currentToast.current?.onExpire?.(); };
  }, [progress, toastProgress]);

  const showNext = useCallback(() => {
    if (active.current || closing.current) return;
    const next = queue.current.shift();
    if (!next) return;
    Keyboard.dismiss();
    active.current = next;
    setCurrent(next);
  }, []);

  const enqueue = useCallback((kind: Request['kind'], title: string, message?: string, actions?: Action[]) => {
    queue.current.push({ kind, title, message, actions: actions?.length ? actions : [{ text: 'Aceptar' }] });
    showNext();
  }, [showNext]);

  useEffect(() => {
    if (!current) return;
    progress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 210, useNativeDriver: true }).start();
    focusTimer.current = setTimeout(() => { const node = findNodeHandle(titleRef.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); }, reduceMotion ? 50 : 250);
    return () => { if (focusTimer.current) clearTimeout(focusTimer.current); };
  }, [current, progress, reduceMotion]);

  const dismiss = useCallback((action?: Action) => {
    if (!active.current || closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: reduceMotion ? 0 : 170, useNativeDriver: true }).start(() => {
      if (!mounted.current) return;
      active.current = null;
      setCurrent(null);
      closing.current = false;
      // Release the modal before invoking a native picker or opening another alert.
      setTimeout(() => { if (!mounted.current) return; action?.onPress?.(); showNext(); }, 100);
    });
  }, [progress, reduceMotion, showNext]);

  const cancel = useCallback(() => dismiss(active.current?.actions.find((item) => item.style === 'cancel')), [dismiss]);
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { if (!active.current) return false; cancel(); return true; });
    return () => handler.remove();
  }, [cancel]);

  // A newer toast replaces the current one; the replaced toast counts as expired.
  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const previous = currentToast.current;
    const next: Toast = { message, id: ++toastId.current, ...options };
    currentToast.current = next;
    setToast(next);
    if (previous && previous.id !== next.id) previous.onExpire?.();
  }, []);

  const closeToast = useCallback((id: number, usedAction: boolean) => {
    const item = currentToast.current;
    if (!item || item.id !== id) return;
    currentToast.current = null;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toastProgress, { toValue: 0, duration: reduceMotion ? 0 : 180, useNativeDriver: true }).start(() => { if (mounted.current && toastId.current === id) setToast(null); });
    if (usedAction) item.action?.onPress(); else item.onExpire?.();
  }, [reduceMotion, toastProgress]);

  useEffect(() => {
    if (!toast || current || keyboardVisible) return;
    const { id, message, action } = toast;
    let cancelled = false;
    if (announcedToast.current !== id) {
      announcedToast.current = id;
      AccessibilityInfo.announceForAccessibility(action ? `${message}. Puedes tocar ${action.label}.` : message);
      if (action) setTimeout(() => { const node = findNodeHandle(toastActionRef.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); }, 400);
    }
    toastProgress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(toastProgress, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start();
    // Toasts with an action stay longer; both respect the user's accessibility timeout setting.
    void AccessibilityInfo.getRecommendedTimeoutMillis(action ? 7000 : 2500).catch(() => (action ? 7000 : 2500)).then((duration) => {
      if (cancelled || !mounted.current || id !== toastId.current) return;
      toastTimer.current = setTimeout(() => closeToast(id, false), duration);
    });
    return () => { cancelled = true; if (toastTimer.current) clearTimeout(toastTimer.current); toastProgress.stopAnimation(); };
  }, [toast, current, keyboardVisible, reduceMotion, toastProgress, closeToast]);

  const feedback: Feedback = {
    alert: (title, message, actions) => { if (actions?.some((action) => action.style === 'destructive')) haptic.warning(); enqueue('dialog', title, message, actions); },
    error: (title, message, actions) => { haptic.error(); enqueue('dialog', title, message, actions); },
    sheet: (title, message, actions) => enqueue('sheet', title, message, actions),
    toast: (message, options) => { if (options?.tone !== 'info') haptic.success(); showToast(message, options); },
  };
  const cancelAction = current?.actions.find((action) => action.style === 'cancel');
  return <Context.Provider value={feedback}>
    <View style={styles.fill} accessibilityElementsHidden={!!current} importantForAccessibility={current ? 'no-hide-descendants' : 'auto'}>{children}</View>
    <Modal visible={!!current} transparent animationType="none" onRequestClose={cancel} statusBarTranslucent>
      <View style={[styles.modalRoot, current?.kind === 'sheet' && styles.sheetRoot]} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, opacity: progress }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={cancel} style={StyleSheet.absoluteFill} />
        {current && <Animated.View style={[styles.panel, current.kind === 'sheet' ? [styles.sheet, { paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 70, 0] }) }] }] : [styles.dialog, { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.96, 1] }) }] }]]}>
          {current.kind === 'sheet' && <View style={styles.handle} />}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
            <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>{current.title}</Text>
            {!!current.message && <Text style={styles.message}>{current.message}</Text>}
            <View style={styles.actions}>{current.actions.filter((action) => action.style !== 'cancel').map((action, index) => {
              const destructive = action.style === 'destructive';
              return <Pressable key={`${action.text}-${index}`} accessibilityRole="button" onPress={() => dismiss(action)} style={({ pressed }) => [current.kind === 'sheet' ? styles.sheetAction : destructive ? styles.danger : styles.primary, pressed && styles.pressed]}>
                {current.kind === 'sheet' && <Ionicons name={action.icon ?? (destructive ? 'trash-outline' : 'ellipse-outline')} size={21} color={destructive ? c.danger : c.primary} />}
                <Text style={current.kind === 'sheet' ? [styles.sheetActionText, destructive && { color: c.danger }] : destructive ? styles.dangerText : styles.primaryText}>{action.text ?? 'Aceptar'}</Text>
              </Pressable>;
            })}
              {cancelAction && <Pressable accessibilityRole="button" onPress={cancel} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}><Text style={styles.cancelText}>{cancelAction.text ?? 'Cancelar'}</Text></Pressable>}
            </View>
          </ScrollView>
        </Animated.View>}
      </View>
    </Modal>
    {!!toast && !current && !keyboardVisible && <Animated.View pointerEvents={toast.action ? 'box-none' : 'none'} accessibilityElementsHidden={!toast.action} importantForAccessibility={toast.action ? 'auto' : 'no-hide-descendants'}
      style={[styles.toast, { bottom: Math.max(insets.bottom, 16) + 84, opacity: toastProgress, transform: [{ translateY: toastProgress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 10, 0] }) }] }]}>
      <Ionicons name={toast.tone === 'info' ? 'information-circle' : 'checkmark-circle'} size={20} color={c.onToast} />
      <Text style={styles.toastText}>{toast.message}</Text>
      {toast.action && <Pressable ref={toastActionRef} accessibilityRole="button" accessibilityLabel={`${toast.action.label}: ${toast.message}`} hitSlop={8} onPress={() => closeToast(toast.id, true)} style={({ pressed }) => [styles.toastAction, pressed && styles.pressed]}><Text style={styles.toastActionText}>{toast.action.label}</Text></Pressable>}
    </Animated.View>}
  </Context.Provider>;
}

const makeStyles = (c: Palette) => ({
  fill: { flex: 1 }, modalRoot: { flex: 1, justifyContent: 'center', padding: space.xxl }, sheetRoot: { justifyContent: 'flex-end', padding: 0 },
  panel: { backgroundColor: c.surface, maxHeight: '85%' }, dialog: { borderRadius: radius.xl, width: '100%', maxWidth: 440, alignSelf: 'center' }, sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.inputBorder, alignSelf: 'center', marginTop: space.md },
  panelContent: { paddingHorizontal: space.xxl, paddingTop: space.xxl, paddingBottom: space.xxl },
  title: { color: c.ink, ...type.section }, message: { color: c.muted, ...type.body, marginTop: 10 },
  actions: { gap: 10, marginTop: space.xxl },
  primary: { minHeight: 52, borderRadius: radius.md, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.lg },
  danger: { minHeight: 52, borderRadius: radius.md, backgroundColor: c.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.lg },
  primaryText: { color: c.onPrimary, ...type.label, textAlign: 'center' }, dangerText: { color: c.surface, ...type.label, textAlign: 'center' },
  cancel: { minHeight: 50, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surfaceAlt }, cancelText: { color: c.primary, ...type.label },
  sheetAction: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.md },
  sheetActionText: { color: c.ink, ...type.label, flex: 1 }, pressed: { opacity: 0.7 },
  toast: { position: 'absolute', left: space.lg, right: space.lg, backgroundColor: c.toast, borderRadius: radius.lg, paddingLeft: space.lg, paddingRight: space.sm, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastText: { color: c.onToast, ...type.label, flex: 1, paddingVertical: space.md }, toastAction: { minHeight: 48, paddingHorizontal: space.md, justifyContent: 'center', borderRadius: radius.sm },
  toastActionText: { color: c.toastAction, ...type.label },
} as const);

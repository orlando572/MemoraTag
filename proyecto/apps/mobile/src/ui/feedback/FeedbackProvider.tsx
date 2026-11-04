import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, BackHandler, findNodeHandle, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Action = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type Request = { kind: 'dialog' | 'sheet'; title: string; message?: string; actions: Action[] };
type Feedback = { alert: (title: string, message?: string, actions?: Action[]) => void; sheet: (title: string, message?: string, actions?: Action[]) => void; toast: (message: string) => void };
const Context = createContext<Feedback | null>(null);

export function useFeedback() {
  const value = useContext(Context);
  if (!value) throw new Error('FeedbackProvider is missing');
  return value;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Request | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const active = useRef<Request | null>(null);
  const queue = useRef<Request[]>([]);
  const closing = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const toastProgress = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);
  const announcedToast = useRef(0);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<Text>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted.current) setReduceMotion(enabled); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const keyboardShown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardHidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { mounted.current = false; listener.remove(); keyboardShown.remove(); keyboardHidden.remove(); if (toastTimer.current) clearTimeout(toastTimer.current); if (focusTimer.current) clearTimeout(focusTimer.current); progress.stopAnimation(); toastProgress.stopAnimation(); };
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

  const showToast = useCallback((message: string) => {
    setToast((previous) => previous?.message === message ? previous : { message, id: ++toastId.current });
  }, []);

  useEffect(() => {
    if (!toast || current || keyboardVisible) return;
    const { id, message } = toast;
    let cancelled = false;
    if (announcedToast.current !== id) { announcedToast.current = id; AccessibilityInfo.announceForAccessibility(message); }
    toastProgress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(toastProgress, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start();
    void AccessibilityInfo.getRecommendedTimeoutMillis(2500).catch(() => 2500).then((duration) => {
      if (cancelled || !mounted.current || id !== toastId.current) return;
      toastTimer.current = setTimeout(() => Animated.timing(toastProgress, { toValue: 0, duration: reduceMotion ? 0 : 180, useNativeDriver: true }).start(({ finished }) => { if (finished && mounted.current && id === toastId.current) setToast(null); }), duration);
    });
    return () => { cancelled = true; if (toastTimer.current) clearTimeout(toastTimer.current); toastProgress.stopAnimation(); };
  }, [toast, current, keyboardVisible, reduceMotion, toastProgress]);

  const feedback: Feedback = { alert: (title, message, actions) => enqueue('dialog', title, message, actions), sheet: (title, message, actions) => enqueue('sheet', title, message, actions), toast: showToast };
  return <Context.Provider value={feedback}>
    <View style={styles.fill} accessibilityElementsHidden={!!current} importantForAccessibility={current ? 'no-hide-descendants' : 'auto'}>{children}</View>
    <Modal visible={!!current} transparent animationType="none" onRequestClose={cancel} statusBarTranslucent>
      <View style={[styles.modalRoot, current?.kind === 'sheet' && styles.sheetRoot]} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={cancel} style={StyleSheet.absoluteFill} />
        {current && <Animated.View style={[styles.panel, current.kind === 'sheet' ? [styles.sheet, { paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 70, 0] }) }] }] : [styles.dialog, { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.96, 1] }) }] }]]}>
          {current.kind === 'sheet' && <View style={styles.handle} />}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
            <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>{current.title}</Text>
            {!!current.message && <Text style={styles.message}>{current.message}</Text>}
            <View style={styles.actions}>{current.actions.filter((action) => action.style !== 'cancel').map((action, index) => <Pressable key={`${action.text}-${index}`} accessibilityRole="button" onPress={() => dismiss(action)} style={({ pressed }) => [current.kind === 'sheet' ? styles.sheetAction : action.style === 'destructive' ? styles.danger : styles.primary, pressed && styles.pressed]}>{current.kind === 'sheet' && <Ionicons name={action.text?.toLowerCase().includes('foto') ? 'camera-outline' : 'images-outline'} size={20} color="#176B57" />}<Text style={current.kind === 'sheet' ? styles.sheetActionText : styles.primaryText}>{action.text ?? 'Aceptar'}</Text></Pressable>)}
              {current.actions.some((action) => action.style === 'cancel') && <Pressable accessibilityRole="button" onPress={cancel} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}><Text style={styles.cancelText}>{current.actions.find((action) => action.style === 'cancel')?.text ?? 'Cancelar'}</Text></Pressable>}
            </View>
          </ScrollView>
        </Animated.View>}
      </View>
    </Modal>
    {!!toast && !current && !keyboardVisible && <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.toast, { bottom: Math.max(insets.bottom, 16) + 88, opacity: toastProgress, transform: [{ translateY: toastProgress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 10, 0] }) }] }]}><Ionicons name="checkmark-circle" size={20} color="#D9F3E6" /><Text style={styles.toastText}>{toast.message}</Text></Animated.View>}
  </Context.Provider>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, modalRoot: { flex: 1, justifyContent: 'center', padding: 24 }, sheetRoot: { justifyContent: 'flex-end', padding: 0 }, scrim: { backgroundColor: 'rgba(13, 30, 24, 0.55)' }, panel: { backgroundColor: '#F8FBF9', maxHeight: '85%' }, dialog: { borderRadius: 24, width: '100%', maxWidth: 440, alignSelf: 'center' }, sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26 }, handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#BBCDC3', alignSelf: 'center', marginTop: 12 }, panelContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }, title: { color: '#203934', fontSize: 21, fontWeight: '700', lineHeight: 27 }, message: { color: '#526C65', fontSize: 15, lineHeight: 23, marginTop: 10 }, actions: { gap: 10, marginTop: 24 }, primary: { minHeight: 50, borderRadius: 14, backgroundColor: '#176B57', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }, danger: { minHeight: 50, borderRadius: 14, backgroundColor: '#A33F43', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' }, cancel: { minHeight: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EAF2ED' }, cancelText: { color: '#176B57', fontSize: 15, fontWeight: '700' }, sheetAction: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: '#DBE7E1', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }, sheetActionText: { color: '#203934', fontSize: 15, fontWeight: '700', flex: 1 }, pressed: { opacity: 0.7 }, toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', backgroundColor: '#203F33', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 9 }, toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flexShrink: 1 },
});

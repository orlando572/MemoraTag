import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, ScrollView, TextInput, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

// Measure the actual scroll viewport as well as the keyboard: fixed footers,
// safe areas and Android resize mode can all reduce the available space.
export function useKeyboardScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const focused = useRef<RefObject<TextInput | null> | null>(null);
  const scrollY = useRef(0);
  const frame = useRef<number | null>(null);
  const keyboardOpen = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  const reveal = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const input = focused.current?.current;
      const scroll = scrollRef.current;
      if (!input || !scroll || !keyboardOpen.current) return;
      const viewport = scroll.getNativeScrollRef();
      if (!viewport) return;
      viewport.measureInWindow((_x, viewportTop, _width, viewportHeight) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (focused.current?.current !== input || !scrollRef.current) return;
          const keyboardTop = Keyboard.metrics()?.screenY ?? Infinity;
          const visibleBottom = Math.min(viewportTop + viewportHeight, keyboardTop) - 24;
          const visibleTop = viewportTop + 16;
          if (visibleBottom <= visibleTop) return;
          const availableHeight = visibleBottom - visibleTop;
          const desiredTop = visibleTop + Math.max(0, (availableHeight - inputHeight) * 0.4);
          const move = inputTop - desiredTop;
          if (Math.abs(move) > 16) scrollRef.current.scrollTo({ y: Math.max(0, scrollY.current + move), animated: true });
        });
      });
    });
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => { keyboardOpen.current = true; setKeyboardVisible(true); reveal(); });
    const hidden = Keyboard.addListener('keyboardDidHide', () => { keyboardOpen.current = false; setKeyboardVisible(false); });
    const changed = Keyboard.addListener('keyboardDidChangeFrame', () => { if (keyboardOpen.current) reveal(); });
    return () => {
      shown.remove();
      hidden.remove();
      changed.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reveal]);

  const focus = useCallback((input: RefObject<TextInput | null>) => { focused.current = input; reveal(); }, [reveal]);
  const blur = useCallback((input: RefObject<TextInput | null>) => { if (focused.current === input) focused.current = null; }, []);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => { scrollY.current = event.nativeEvent.contentOffset.y; }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => { setViewportHeight(event.nativeEvent.layout.height); reveal(); }, [reveal]);
  const reset = useCallback(() => { focused.current = null; scrollY.current = 0; }, []);

  return { scrollRef, focus, blur, onScroll, onLayout, onContentSizeChange: reveal, reveal, keyboardVisible, extraSpace: keyboardVisible ? Math.max(120, viewportHeight * 0.5) : 0, reset };
}

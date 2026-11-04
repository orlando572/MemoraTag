import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useFeedback } from '../ui/feedback/FeedbackProvider';

/**
 * Error prevention: leaving a form with unsaved changes (back button, gesture or «Volver»)
 * asks before discarding them. Call `allowLeave()` right before navigating after a save.
 */
export function useUnsavedGuard(dirty: boolean) {
  const navigation = useNavigation();
  const Alert = useFeedback();
  const allowed = useRef(false);
  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!dirty || allowed.current) return;
      event.preventDefault();
      Alert.alert('¿Descartar los cambios?', 'Has hecho cambios que todavía no se han guardado.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ]);
    });
  }, [navigation, dirty, Alert]);
  return { allowLeave: () => { allowed.current = true; } };
}

import { Stack } from 'expo-router';
import { FeedbackProvider } from '../src/ui/feedback/FeedbackProvider';

export default function Layout() {
  return <FeedbackProvider><Stack screenOptions={{ headerShown: false }} /></FeedbackProvider>;
}

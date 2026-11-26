import { Redirect } from 'expo-router';

// The company home now lives at «/» when «Modo empresa» is on.
export default function CompanyRoute() {
  return <Redirect href="/" />;
}

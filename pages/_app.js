import { ClerkProvider } from '@clerk/nextjs';
import '../styles/globals.css';

// Matches the app's dark shell so Clerk's UI doesn't arrive as a white rectangle.
const clerkAppearance = {
  variables: {
    colorBackground: '#0B1120',
    colorPrimary: '#60A5FA',
    colorText: '#E8EDF7',
    colorTextSecondary: '#94A3B8',
    colorInputBackground: '#131C2E',
    colorInputText: '#E8EDF7',
    borderRadius: '12px',
    fontFamily: '"Geist", system-ui, sans-serif',
  },
  elements: {
    // The footer carries Clerk's "Sign up" link — hiding it leaves no way to
    // create an account, so it stays visible.
    card: { border: '1px solid #1F2A3E', boxShadow: 'none' },
  },
};

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider
      {...pageProps}
      appearance={clerkAppearance}
      // Guest mode owns "/", so every auth exit lands back there rather than on
      // a dashboard route that does not exist. Fallback (not force) variants:
      // they only apply when the flow carries no redirect_url of its own, so the
      // modal SignInButton still returns the user to the page they started on.
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

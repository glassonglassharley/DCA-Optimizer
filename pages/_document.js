import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Minimal custom document — created solely to carry the iOS home-screen icon.
 *
 * iOS ignores the web app manifest for "Add to Home Screen" and reads
 * <link rel="apple-touch-icon"> instead, so this tag is the only thing that
 * puts a real icon on an iPhone home screen. The PNG is deliberately square
 * with no rounded corners and no alpha: iOS applies its own corner mask, and a
 * pre-rounded source gets double-clipped.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
        {/* manifest.json lived at the repo root, which Next does not serve, so
            /manifest.json 404'd and Android never saw an install icon. It now
            sits in public/ and is linked from here. */}
        <link rel="manifest" href="/manifest.json"/>
      </Head>
      <body>
        <Main/>
        <NextScript/>
      </body>
    </Html>
  );
}

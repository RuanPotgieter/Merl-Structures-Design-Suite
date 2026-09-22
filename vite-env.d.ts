/// <reference types="vite/client" />
/// <reference types="@react-three/fiber" />

import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }

  const __APP_VERSION__: string;
  const __BUILD_TIMESTAMP__: string;
  const __BUILD_HASH__: string;
}


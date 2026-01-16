"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import AuthProviderClient with SSR disabled
// This prevents Firebase Auth from being initialized on the server
const AuthProviderClient = dynamic(
  () => import('./AuthProviderClient').then(mod => mod.AuthProviderClient),
  { ssr: false }
);

const AuthRedirector = dynamic(
  () => import('./AuthRedirector'),
  { ssr: false }
);

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviderClient>
      {children}
      <AuthRedirector />
    </AuthProviderClient>
  );
}

export default AuthWrapper;


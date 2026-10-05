'use client';

import { useEffect } from 'react';
import { connectClassicNavigation } from '@/lib/classic-navigation';
import { classicMarkup, classicScripts } from '@/generated/classic-ui';

// Preserve the original DOM IDs, extension messages and saved preferences.
// The root layout keeps this component mounted during Next navigation.
let bootPromise: Promise<void> | undefined;
type WorkspaceScript = { attributes: Record<string, string>; content: string };

function startWorkspace(): Promise<void> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    for (const descriptor of classicScripts as WorkspaceScript[]) {
      const script = document.createElement('script');
      for (const [name, value] of Object.entries(descriptor.attributes)) script.setAttribute(name, value);
      script.async = false;
      if (descriptor.attributes.src) {
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Could not load ${descriptor.attributes.src}`));
          document.body.append(script);
        });
      } else {
        script.textContent = descriptor.content;
        document.body.append(script);
      }
    }
    // Dynamic script loading must finish before restoring a saved sheet panel.
    // The original parser loaded these modules before Auth requests completed.
    const runtime = window as Window & { TRAINFLOW_BOOT_WORKSPACE?: () => Promise<void> };
    await runtime.TRAINFLOW_BOOT_WORKSPACE?.();
  })();
  return bootPromise;
}

export default function ClassicWorkspace() {
  useEffect(() => {
    const navigation = connectClassicNavigation();
    void startWorkspace().then(() => navigation.ready()).catch((error: Error) => {
      const startup = document.getElementById('startup-screen');
      const login = document.getElementById('auth-box');
      const message = document.getElementById('auth-message');
      if (startup) startup.hidden = true;
      if (login) login.hidden = false;
      if (message) message.textContent = document.documentElement.lang === 'ar'
        ? 'تعذر تحميل البرنامج. حدّث الصفحة وحاول مرة أخرى.'
        : 'Could not load the workspace. Refresh and try again.';
      console.error(error);
    });
    return () => navigation.dispose();
  }, []);

  return <div className="trainflow-workspace-root" dangerouslySetInnerHTML={{ __html: classicMarkup }} />;
}

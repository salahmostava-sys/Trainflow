"use client";

import { useEffect } from "react";
import type { Panel, WorkspaceRuntimeWindow } from "@/lib/workspace-types";
import { workspaceScripts } from "@/generated/workspace-assets";
import { WorkspaceShell } from "./WorkspaceShell";
import { WorkspaceViews } from "@/client/workspace-views";

let bootPromise: Promise<void> | undefined;
const loadedScripts = new Set<string>();
function loadScript(descriptor: Record<string, string>) {
  if (loadedScripts.has(descriptor.src)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    for (const [name, value] of Object.entries(descriptor))
      script.setAttribute(name, value);
    script.async = false;
    script.onload = () => {
      loadedScripts.add(descriptor.src);
      resolve();
    };
    script.onerror = () => {
      // Remove the failed tag so a retry requests the file again.
      script.remove();
      reject(new Error("Could not load " + descriptor.src));
    };
    document.body.append(script);
  });
}
async function bootWorkspace() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    for (const descriptor of workspaceScripts) await loadScript(descriptor);
    const runtime = window as WorkspaceRuntimeWindow;
    const navigation = runtime.connectWorkspaceNavigation();
    await runtime.TRAINFLOW_BOOT_WORKSPACE();
    navigation.ready();
  })();
  // A failed start-up must not be cached: the next attempt starts again,
  // reusing scripts that already loaded.
  bootPromise.catch(() => {
    bootPromise = undefined;
  });
  return bootPromise;
}

export function WorkspaceApplication({
  initialPanel,
}: {
  initialPanel: Panel;
}) {
  useEffect(() => {
    window.WorkspaceViews = WorkspaceViews;
    const startupMessage = document.getElementById("startup-message");
    const english = () => document.documentElement.lang === "en";
    let retryButton: HTMLButtonElement | null = null;
    const start = () => {
      retryButton?.remove();
      retryButton = null;
      document.getElementById("startup-screen").hidden = false;
      document.getElementById("auth-box").hidden = true;
      startupMessage.textContent = english()
        ? "Loading workspace…"
        : "جارٍ تحميل مساحة العمل…";
      void bootWorkspace().catch((error: Error) => {
        console.error(error);
        document.getElementById("startup-screen").hidden = true;
        document.getElementById("auth-box").hidden = false;
        const message = document.getElementById("auth-message");
        message.textContent = english()
          ? "Could not load the workspace."
          : "تعذر تحميل البرنامج.";
        retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.className = "btn";
        retryButton.textContent = english() ? "Try again" : "إعادة المحاولة";
        retryButton.addEventListener("click", start);
        message.after(retryButton);
      });
    };
    start();
    return () => retryButton?.remove();
  }, []);
  return <WorkspaceShell initialPanel={initialPanel} />;
}

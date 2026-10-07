"use client";

import { useEffect } from "react";
import type { Panel, WorkspaceRuntimeWindow } from "@/lib/workspace-types";
import { workspaceScripts } from "@/generated/workspace-assets";
import { WorkspaceShell } from "./WorkspaceShell";

let bootPromise: Promise<void> | undefined;
async function bootWorkspace() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    for (const descriptor of workspaceScripts) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        for (const [name, value] of Object.entries(descriptor))
          script.setAttribute(name, value);
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Could not load " + descriptor.src));
        document.body.append(script);
      });
    }
    const runtime = window as WorkspaceRuntimeWindow;
    const navigation = runtime.connectWorkspaceNavigation();
    await runtime.TRAINFLOW_BOOT_WORKSPACE();
    navigation.ready();
  })();
  return bootPromise;
}

export function WorkspaceApplication({
  initialPanel,
}: {
  initialPanel: Panel;
}) {
  useEffect(() => {
    const startupMessage = document.getElementById("startup-message");
    startupMessage.textContent =
      document.documentElement.lang === "en"
        ? "Loading workspace…"
        : "جارٍ تحميل مساحة العمل…";
    void bootWorkspace().catch((error: Error) => {
      document.getElementById("startup-screen").hidden = true;
      document.getElementById("auth-box").hidden = false;
      document.getElementById("auth-message").textContent =
        document.documentElement.lang === "ar"
          ? "تعذر تحميل البرنامج. حدّث الصفحة وحاول مرة أخرى."
          : "Could not load the workspace. Refresh and try again.";
      console.error(error);
    });
  }, []);
  return <WorkspaceShell initialPanel={initialPanel} />;
}

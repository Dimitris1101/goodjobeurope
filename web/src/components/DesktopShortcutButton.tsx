"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** ---- Types (χωρίς any) ---- */
type Platform = "windows" | "mac" | "linux" | "unknown";

/** Επίσημος τύπος για το beforeinstallprompt (Chrome) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** ---- Helpers ---- */
function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac os x") || ua.includes("macintosh")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

function buildWindowsUrl(siteUrl: string, iconUrl: string) {
  const lines = [
    "[InternetShortcut]",
    `URL=${siteUrl}/`,
    `IconFile=${iconUrl}`, // fallback περίπτωση
    "IconIndex=0",
    "",
  ];
  return lines.join("\r\n");
}

function buildMacWebloc(siteUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>URL</key>
    <string>${siteUrl}/</string>
  </dict>
</plist>`;
}

function buildLinuxDesktop(siteUrl: string, iconUrl: string) {
  return `[Desktop Entry]
Type=Application
Name=GOODJOBEUROPE
Exec=xdg-open ${siteUrl}/
Icon=${iconUrl}
Terminal=false
Categories=Network;WebBrowser;
`;
}

function downloadFile(filename: string, content: string, mime = "application/octet-stream") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Δημιουργεί .bat που:
 *  1) Κατεβάζει Icon.ico σε %USERPROFILE%\GOODJOBEUROPE\Icon.ico
 *  2) Φτιάχνει GOODJOBEUROPE.lnk στην Επιφάνεια Εργασίας
 *     με IconLocation = το τοπικό ico
 */
function buildWindowsBat(siteUrl: string, iconPath: string) {
  return `@echo off
setlocal
set "APPNAME=GOODJOBEUROPE"
set "ICONDIR=%USERPROFILE%\\%APPNAME%"
set "ICONFILE=%ICONDIR%\\Icon.ico"
set "DESKTOP=%USERPROFILE%\\Desktop"
set "LNK=%DESKTOP%\\%APPNAME%.lnk"

if not exist "%ICONDIR%" mkdir "%ICONDIR%"
echo Downloading icon...
powershell -Command "Try { Invoke-WebRequest -Uri '${siteUrl}${iconPath}' -OutFile '%ICONFILE%' -UseBasicParsing } Catch { $null }"

rem Προσπάθησε με Chrome, αλλιώς άνοιγμα με default browser μέσω rundll32
set "CHROME=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
if not exist "%CHROME%" goto :DEFAULT

:CHROME_SHORTCUT
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%LNK%'); " ^
  "$s.TargetPath = '%CHROME%'; " ^
  "$s.Arguments = '${siteUrl}/'; " ^
  "$s.IconLocation = '%ICONFILE%,0'; " ^
  "$s.Description = '${siteUrl}'; " ^
  "$s.Save()"
echo Created "%LNK%" (Chrome)
goto :END

:DEFAULT
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%LNK%'); " ^
  "$s.TargetPath = '%SystemRoot%\\System32\\rundll32.exe'; " ^
  "$s.Arguments = 'url.dll,FileProtocolHandler ${siteUrl}/'; " ^
  "$s.IconLocation = '%ICONFILE%,0'; " ^
  "$s.Description = '${siteUrl}'; " ^
  "$s.Save()"
echo Created "%LNK%" (Default Browser)

:END
timeout /t 1 >nul
endlocal
`;
}

/** ---- Component ---- */
export default function DesktopShortcutButton() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => setPlatform(detectPlatform()), []);

  // PWA install (αν έχεις service worker & valid manifest)
  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      evt.preventDefault();
      deferredPromptRef.current = evt;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    const dp = deferredPromptRef.current;
    if (!dp) return;
    await dp.prompt();
    try {
      await dp.userChoice;
    } catch {
      /* ignore */
    }
    setCanInstall(false);
    deferredPromptRef.current = null;
  };

  const { SITE_URL, ICON_PATH, ICON_URL } = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const siteUrl = origin.replace(/\/+$/, "");

    // 🔴 ΣΗΜΑΝΤΙΚΟ:
    // Βάλε ένα αρχείο /public/Icon.ico (από το Icon.png σου)
    const iconPath = "/Icon.ico";
    const iconUrl = `${siteUrl}${iconPath}`;

    return { SITE_URL: siteUrl, ICON_PATH: iconPath, ICON_URL: iconUrl };
  }, []);

  const handleDownload = () => {
    if (platform === "windows") {
      const bat = buildWindowsBat(SITE_URL, ICON_PATH);
      downloadFile(
        "Create_GOODJOBEUROPE_Shortcut.bat",
        bat,
        "application/octet-stream"
      );
      return;
    }
    if (platform === "mac") {
      const content = buildMacWebloc(SITE_URL);
      downloadFile("GOODJOBEUROPE.webloc", content, "application/xml");
      return;
    }
    if (platform === "linux") {
      const content = buildLinuxDesktop(SITE_URL, ICON_URL);
      downloadFile("goodjobeurope.desktop", content, "text/plain");
      return;
    }
    // Fallback: απλό .url
    const content = buildWindowsUrl(SITE_URL, ICON_URL);
    downloadFile("GOODJOBEUROPE.url", content, "text/plain");
  };

  return (
    <div className="flex items-center gap-2">
      {canInstall && (
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-full bg-white text-black px-3 py-1.5 text-sm hover:opacity-90"
          title="Install as App"
        >
          Install App
        </button>
      )}
      <button
        type="button"
        onClick={handleDownload}
        className="rounded-full border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10"
        title="Download desktop shortcut"
      >
        Download Shortcut
      </button>
    </div>
  );
}

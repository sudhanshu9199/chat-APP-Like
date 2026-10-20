/**
 * 2026 ConnectX BYOD (Bring Your Own Drive) Cloud Backup & Local Vault Service
 * ₹0-Cost Architecture:
 * - Uses user's personal Google Drive via Google Drive REST API v3
 * - Stores encrypted/compressed backup in Google Drive's hidden `appDataFolder`
 * - Zero Google app verification friction (appDataFolder is private to the user)
 * - Zero-clutter: Files do not show up in the user's regular Drive list
 * - One-click Local JSON export / import fallback (100% offline support)
 */

import { exportVault, importVault } from "./chatDb";

const BACKUP_FILE_NAME = "connectx_chat_vault.json";

/**
 * ─── 1. LOCAL VAULT EXPORT (ONE-CLICK DOWNLOAD) ───
 */
export async function downloadLocalBackup() {
  try {
    const jsonString = await exportVault();
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `connectx-vault-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error("[VaultBackup] Failed to export local file:", err);
    throw err;
  }
}

/**
 * ─── 2. LOCAL VAULT RESTORE (FILE PICKER) ───
 */
export async function restoreFromLocalFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file selected"));
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const result = await importVault(text);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (e) => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * ─── 3. GOOGLE DRIVE BACKUP (BYOD APP DATA FOLDER) ───
 * Uploads or updates connectx_chat_vault.json in user's hidden appDataFolder
 */
export async function backupToGoogleDrive(accessToken) {
  if (!accessToken) {
    throw new Error("Google access token required for Drive sync");
  }

  const jsonString = await exportVault();

  // Step 1: Check if existing backup file exists in appDataFolder
  const listUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errorText = await listRes.text();
    if (errorText.includes("has not been used in project") || errorText.includes("disabled")) {
      throw new Error(
        "Google Drive API is disabled in your Google Cloud project. Enable it at: https://console.cloud.google.com/apis/library/drive.googleapis.com"
      );
    }
    throw new Error(`Failed to query Google Drive appData: ${errorText}`);
  }

  const listData = await listRes.json();
  const existingFile = listData.files && listData.files.length > 0 ? listData.files[0] : null;

  if (existingFile) {
    // Step 2A: Update existing backup file
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: jsonString,
    });

    if (!updateRes.ok) {
      throw new Error("Failed to update Google Drive backup");
    }

    return {
      success: true,
      fileId: existingFile.id,
      action: "updated",
      timestamp: new Date().toISOString(),
    };
  } else {
    // Step 2B: Multipart create new backup file in appDataFolder
    const metadata = {
      name: BACKUP_FILE_NAME,
      parents: ["appDataFolder"],
      mimeType: "application/json",
      description: "ConnectX 2026 Chat Vault Encrypted/JSON Backup",
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      jsonString +
      closeDelimiter;

    const createUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Failed to create Google Drive backup: ${errorText}`);
    }

    const file = await createRes.json();
    return {
      success: true,
      fileId: file.id,
      action: "created",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ─── 4. GOOGLE DRIVE RESTORE (BYOD APP DATA FOLDER) ───
 */
export async function restoreFromGoogleDrive(accessToken) {
  if (!accessToken) {
    throw new Error("Google access token required for Drive sync");
  }

  // Find file in appDataFolder
  const listUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,modifiedTime)`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errorText = await listRes.text();
    if (errorText.includes("has not been used in project") || errorText.includes("disabled")) {
      throw new Error(
        "Google Drive API is disabled in your Google Cloud project. Enable it at: https://console.cloud.google.com/apis/library/drive.googleapis.com"
      );
    }
    throw new Error("Failed to query Google Drive appData folder");
  }

  const listData = await listRes.json();
  const file = listData.files && listData.files.length > 0 ? listData.files[0] : null;

  if (!file) {
    throw new Error("No previous ConnectX backup found in your Google Drive.");
  }

  // Download media
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  const downloadRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!downloadRes.ok) {
    throw new Error("Failed to download backup from Google Drive");
  }

  const content = await downloadRes.text();
  const importResult = await importVault(content);

  return {
    ...importResult,
    lastBackupTime: file.modifiedTime,
  };
}

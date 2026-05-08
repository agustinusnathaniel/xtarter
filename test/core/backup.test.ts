import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { backupFile, listBackups } from "@xtarterize/core";
import { describe, expect, it } from "vite-plus/test";

describe("backup", () => {
  it("recovers when backup index is malformed", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "xtarterize-backup-"));
    await fs.writeFile(path.join(tmpDir, "foo.txt"), "before", "utf-8");

    const backupDir = path.join(tmpDir, ".xtarterize", "backups");
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, ".index.json"), "{broken", "utf-8");

    await backupFile(tmpDir, "foo.txt");
    const backups = await listBackups(tmpDir, "foo.txt");

    expect(backups.length).toBe(1);
    expect(backups[0]?.filepath).toBe("foo.txt");
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});

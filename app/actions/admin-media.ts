"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { getTenantContext } from "@/lib/tenant-context";
import { requireAdmin } from "@/lib/admin-session";
import { objectStorage } from "@/lib/storage";

/**
 * Sube uno o varios archivos a /public/uploads y los registra en la BD bajo el Tenant actual.
 */
export async function uploadMedia(formData: FormData) {
  await requireAdmin(["OWNER", "MANAGER"]);

  try {
    const tenant = await getTenantContext();
    const db = await getTenantDb();
    const rawFiles = formData.getAll("files");
    const singleFile = formData.get("file");
    const files: File[] = [];

    if (rawFiles.length > 0) {
      for (const f of rawFiles) {
        if (f instanceof File && f.size > 0) files.push(f);
      }
    } else if (singleFile instanceof File && singleFile.size > 0) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return { success: false, error: "No se seleccionó ningún archivo válido para subir." };
    }

    const savedAssets = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploaded = await objectStorage.upload({
        tenantId: tenant.id,
        folder: "general",
        fileName: file.name,
        mimeType: file.type.toLowerCase(),
        buffer,
      });
      const asset = await db.mediaAsset.create({
        data: {
          name: file.name,
          filename: uploaded.objectKey,
          url: uploaded.url,
          sizeBytes: uploaded.sizeBytes,
          mimeType: uploaded.mimeType,
          tenantId: tenant.id,
        }
      });

      savedAssets.push(asset);
    }

    revalidatePath("/admin/media");
    revalidatePath("/admin/catalog");
    revalidatePath("/admin/settings");

    return {
      success: true,
      assets: savedAssets,
      primaryUrl: savedAssets[0]?.url
    };
  } catch (error: any) {
    console.error("Error al subir archivo:", error);
    return { success: false, error: error?.message || "Ocurrió un error al procesar la subida." };
  }
}

/**
 * Obtiene la lista completa de archivos multimedia del tenant, con soporte de búsqueda.
 */
export async function getMediaAssets(search?: string) {
  await requireAdmin();

  try {
    const tenant = await getTenantContext();
    const db = await getTenantDb();

    // Sincronizar archivos existentes en public/uploads/{tenantId} si no están en la BD
    const tenantUploadsDir = path.join(process.cwd(), "public", "uploads", tenant.id);
    if (fs.existsSync(tenantUploadsDir)) {
      const diskFiles = await fs.promises.readdir(tenantUploadsDir);
      for (const file of diskFiles) {
        const ext = path.extname(file).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"].includes(ext)) {
          const exists = await db.mediaAsset.findFirst({ where: { filename: file } });
          if (!exists) {
            try {
              const stat = await fs.promises.stat(path.join(tenantUploadsDir, file));
              const mimeMap: Record<string, string> = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
                ".gif": "image/gif",
                ".svg": "image/svg+xml",
                ".avif": "image/avif"
              };
              await db.mediaAsset.create({
                data: {
                  name: file,
                  filename: file,
                  url: `/uploads/${tenant.id}/${file}`,
                  sizeBytes: stat.size,
                  mimeType: mimeMap[ext] || "image/jpeg",
                  tenantId: tenant.id,
                }
              });
            } catch {
              // ignore stat errors
            }
          }
        }
      }
    }

    const where = search?.trim()
      ? {
          OR: [
            { name: { contains: search.trim() } },
            { filename: { contains: search.trim() } }
          ]
        }
      : undefined;

    const assets = await db.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    return { success: true, assets };
  } catch (error: any) {
    console.error("Error al obtener galería de medios:", error);
    return { success: false, error: error?.message || "Error al cargar la galería", assets: [] };
  }
}

/**
 * Elimina un recurso multimedia de la BD y del disco.
 */
export async function deleteMediaAsset(id: string) {
  await requireAdmin(["OWNER", "MANAGER"]);

  try {
    const tenant = await getTenantContext();
    const db = await getTenantDb();
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return { success: false, error: "El archivo no existe o ya fue eliminado." };
    }

    if (asset.filename.startsWith(`tenants/${tenant.id}/`)) {
      await objectStorage.delete(tenant.id, asset.filename);
    } else {
      // Compatibilidad con archivos locales creados antes del object storage.
      const filePath = path.join(process.cwd(), "public", "uploads", tenant.id, path.basename(asset.filename));
      if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.warn("No se pudo borrar el archivo físico:", filePath, err);
      }
      }
    }

    await db.mediaAsset.delete({ where: { id } });

    revalidatePath("/admin/media");
    revalidatePath("/admin/catalog");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar archivo:", error);
    return { success: false, error: error?.message || "Error al eliminar el archivo." };
  }
}

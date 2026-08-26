import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db";
import { requireAdmin } from "@/lib/admin-session";

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "video/x-matroska",
  "video/avi",
  "video/mpeg",
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const tenant = await getTenantContext();
    const db = await getTenantDb();

    const formData = await request.formData();
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
      return NextResponse.json(
        { success: false, error: "No se seleccionó ningún archivo para subir." },
        { status: 400 }
      );
    }

    const tenantUploadsDir = path.join(process.cwd(), "public", "uploads", tenant.id);
    if (!fs.existsSync(tenantUploadsDir)) {
      fs.mkdirSync(tenantUploadsDir, { recursive: true });
    }

    const savedAssets = [];

    for (const file of files) {
      const mimeType = file.type.toLowerCase();
      const ext = path.extname(file.name).toLowerCase();
      const isValidExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".mp4", ".webm", ".mov", ".mkv", ".ogg", ".avi"].includes(ext);

      if (!ALLOWED_MIME_TYPES.has(mimeType) && !isValidExt) {
        return NextResponse.json(
          {
            success: false,
            error: `Tipo de archivo no permitido: ${file.type || ext}. Formatos válidos: JPG, PNG, WEBP, GIF, SVG, MP4, WEBM, MOV.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `El archivo ${file.name} supera el límite máximo permitido de 50 MB.`,
          },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const cleanOriginalName = sanitizeFileName(file.name);
      const uniqueFileName = `${timestamp}_${cleanOriginalName}`;
      const destinationPath = path.join(tenantUploadsDir, uniqueFileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.promises.writeFile(destinationPath, buffer);

      const publicUrl = `/uploads/${tenant.id}/${uniqueFileName}`;
      const resolvedMime = mimeType || (ext.startsWith(".mp4") ? "video/mp4" : ext.startsWith(".webm") ? "video/webm" : ext.startsWith(".mov") ? "video/quicktime" : "application/octet-stream");

      const asset = await db.mediaAsset.create({
        data: {
          name: file.name,
          filename: uniqueFileName,
          url: publicUrl,
          sizeBytes: file.size,
          mimeType: resolvedMime,
          tenantId: tenant.id,
        },
      });

      savedAssets.push(asset);
    }

    return NextResponse.json({
      success: true,
      assets: savedAssets,
      primaryUrl: savedAssets[0]?.url,
    });
  } catch (error) {
    console.error("Error en /api/admin/media/upload:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al procesar la subida del archivo.",
      },
      { status: 500 }
    );
  }
}

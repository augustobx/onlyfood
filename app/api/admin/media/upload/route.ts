import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db";
import { requireAdmin } from "@/lib/admin-session";
import { objectStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(["OWNER", "MANAGER"]);
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

    const savedAssets = [];

    for (const file of files) {
      const mimeType = file.type.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploaded = await objectStorage.upload({ tenantId: tenant.id, folder: "general", fileName: file.name, mimeType, buffer });

      const asset = await db.mediaAsset.create({
        data: {
          name: file.name,
          filename: uploaded.objectKey,
          url: uploaded.url,
          sizeBytes: uploaded.sizeBytes,
          mimeType: uploaded.mimeType,
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

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  Search,
  Loader2,
  FileImage,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getMediaAssets, uploadMedia, deleteMediaAsset } from "@/app/actions/admin-media";

interface MediaAsset {
  id: string;
  name: string;
  filename: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date | string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function MediaClient() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = async (searchTerm?: string) => {
    setIsLoading(true);
    try {
      const res = await getMediaAssets(searchTerm);
      if (res.success && res.assets) {
        setAssets(res.assets as MediaAsset[]);
      } else {
        toast.error("Error al cargar galería", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);

    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append("files", fileList[i]);
    }

    try {
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const res = await response.json();
      if (res.success && res.assets) {
        toast.success(`¡${res.assets.length === 1 ? "Imagen subida" : `${res.assets.length} imágenes subidas`} con éxito!`);
        await loadAssets(search);
      } else {
        toast.error("Error al subir archivo", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error en la subida");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (e: React.MouseEvent, asset: MediaAsset) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar la imagen "${asset.name}"? Los productos que la utilicen dejarán de mostrarla.`)) return;

    try {
      const res = await deleteMediaAsset(asset.id);
      if (res.success) {
        toast.success("Imagen eliminada de la galería");
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        if (previewAsset?.id === asset.id) setPreviewAsset(null);
      } else {
        toast.error("No se pudo eliminar", { description: res.error });
      }
    } catch (err) {
      toast.error("Error al eliminar imagen");
    }
  };

  const handleCopyUrl = (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const totalSize = assets.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-7 h-7 text-orange-500" />
            Galería de Medios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Subí fotos para tus hamburguesas, bowls, combos, banners y logos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAssets(search)}
            className="h-10 px-3 rounded-xl"
            title="Recargar galería"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" /> Subir Imágenes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Upload Dropzone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 border-2 border-dashed rounded-3xl transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? "border-orange-500 bg-orange-50/50 scale-[1.01]"
            : "border-slate-300 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/20"
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
          <Upload className="w-7 h-7" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-800">
            {isDragging ? "Soltá tus imágenes aquí" : "Hacé click o arrastrá imágenes aquí"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Admite JPG, PNG, WEBP, GIF, SVG y AVIF hasta 10 MB por archivo. Podés subir varias a la vez.
          </p>
        </div>
      </div>

      {/* Gallery & Controls */}
      <Card className="rounded-3xl shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900">
                {assets.length} {assets.length === 1 ? "Imagen" : "Imágenes"}
              </span>
              <span className="text-xs text-muted-foreground">({formatBytes(totalSize)})</span>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  loadAssets(e.target.value);
                }}
                className="pl-9 h-9 text-xs rounded-xl bg-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-sm font-medium">Cargando fotos de la galería...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-sm text-slate-700">No se encontraron imágenes</p>
              <p className="text-xs text-slate-400">Subí fotos usando el área de carga de arriba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setPreviewAsset(asset)}
                  className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                    <Image
                      src={asset.url}
                      alt={asset.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, 200px"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleCopyUrl(e, asset.url, asset.id)}
                        title="Copiar URL"
                        className="w-7 h-7 rounded-lg bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors shadow-md"
                      >
                        {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, asset)}
                        title="Eliminar"
                        className="w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-0.5 bg-white border-t">
                    <p className="text-[11px] font-bold text-slate-800 truncate" title={asset.name}>
                      {asset.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{formatBytes(asset.sizeBytes)}</span>
                      <span>{new Date(asset.createdAt).toLocaleDateString("es-AR")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Preview Modal */}
      {previewAsset && (
        <Dialog open={Boolean(previewAsset)} onOpenChange={(open) => !open && setPreviewAsset(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-slate-950 text-white border-slate-800">
            <DialogHeader className="p-4 border-b border-slate-800">
              <DialogTitle className="text-base font-bold truncate pr-6">{previewAsset.name}</DialogTitle>
            </DialogHeader>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <Image
                src={previewAsset.url}
                alt={previewAsset.name}
                fill
                className="object-contain"
                sizes="600px"
              />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="text-xs text-slate-400 space-y-0.5">
                <p><strong>Tamaño:</strong> {formatBytes(previewAsset.sizeBytes)}</p>
                <p><strong>Ruta:</strong> <code className="text-orange-400">{previewAsset.url}</code></p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => handleCopyUrl(e, previewAsset.url, previewAsset.id)}
                  className="text-xs font-bold rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Enlace
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => handleDelete(e, previewAsset)}
                  className="text-xs font-bold rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

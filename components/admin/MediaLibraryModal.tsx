"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  Search,
  Loader2,
  Plus,
  X,
  FileImage,
  Video,
  Film,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { getMediaAssets, deleteMediaAsset } from "@/app/actions/admin-media";

interface MediaAsset {
  id: string;
  name: string;
  filename: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date | string;
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (url: string) => void;
  title?: string;
  filterType?: "ALL" | "IMAGE" | "VIDEO";
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isVideoAsset(asset: MediaAsset): boolean {
  if (asset.mimeType?.startsWith("video/")) return true;
  const ext = asset.filename?.toLowerCase() || "";
  return ext.endsWith(".mp4") || ext.endsWith(".webm") || ext.endsWith(".mov") || ext.endsWith(".mkv") || ext.endsWith(".ogg") || ext.endsWith(".avi");
}

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  title = "Galería de Medios (Imágenes y Videos)",
  filterType = "ALL",
}: MediaLibraryModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "IMAGE" | "VIDEO">(filterType);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = async (searchTerm?: string) => {
    setIsLoading(true);
    try {
      const res = await getMediaAssets(searchTerm);
      if (res.success && res.assets) {
        setAssets(res.assets as MediaAsset[]);
      } else {
        toast.error("Error al cargar medios", { description: res.error });
      }
    } catch {
      toast.error("Error al conectar con la galería");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAssets(search);
      setActiveTab(filterType);
    }
  }, [isOpen, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAssets(search);
  };

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

      const result = await response.json();

      if (result.success && result.assets) {
        toast.success(`¡${result.assets.length} archivo(s) subido(s) con éxito!`);
        await loadAssets(search);
        if (onSelect && result.assets.length === 1) {
          onSelect(result.assets[0].url);
          onClose();
        }
      } else {
        toast.error("Error al subir archivo", { description: result.error || "Formato o tamaño no válido." });
      }
    } catch (err: any) {
      toast.error("Error en la subida", { description: err?.message || "Revisá tu conexión." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de eliminar este archivo? Si algún producto lo está usando, dejará de verse.")) return;

    try {
      const res = await deleteMediaAsset(id);
      if (res.success) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        toast.success("Archivo eliminado de la galería");
      } else {
        toast.error("No se pudo eliminar", { description: res.error });
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleCopyUrl = (url: string, id: string, e: React.MouseEvent) => {
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

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const isVid = isVideoAsset(asset);
      if (activeTab === "IMAGE" && isVid) return false;
      if (activeTab === "VIDEO" && !isVid) return false;
      return true;
    });
  }, [assets, activeTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[88vh] flex flex-col p-0 gap-0 bg-slate-950 text-slate-100 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-orange-500" />
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Seleccioná una imagen o video para tu producto o splash, o subí nuevos archivos desde tu equipo (hasta 50 MB).
              </DialogDescription>
            </div>

            {/* Upload Button */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs h-9 rounded-xl shadow-md"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1.5" /> Subir Fotos / Videos
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Search bar & Type Filter Tabs */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nombre de archivo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-slate-900 border-slate-700 text-xs text-white rounded-xl focus:border-orange-500"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" className="h-9 px-4 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200">
                Buscar
              </Button>
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    loadAssets("");
                  }}
                  className="h-9 px-2 text-xs text-slate-400 hover:text-white"
                >
                  Limpiar
                </Button>
              )}
            </form>

            <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "ALL" ? "bg-orange-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Todos ({assets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("IMAGE")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "IMAGE" ? "bg-orange-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Fotos ({assets.filter((a) => !isVideoAsset(a)).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("VIDEO")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeTab === "VIDEO" ? "bg-orange-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Video className="w-3 h-3" /> Videos ({assets.filter(isVideoAsset).length})
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Body Dropzone & Grid */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 overflow-y-auto p-5 transition-colors ${
            isDragging ? "bg-orange-950/20 ring-2 ring-orange-500 ring-inset" : "bg-slate-950"
          }`}
        >
          {isDragging && (
            <div className="mb-4 p-8 border-2 border-dashed border-orange-500 rounded-2xl text-center bg-orange-500/10">
              <Upload className="w-8 h-8 text-orange-400 mx-auto mb-2 animate-bounce" />
              <p className="font-bold text-sm text-orange-300">Soltá tus fotos o videos aquí para subirlos inmediatamente</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-xs font-medium">Cargando galería...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-slate-800/80 rounded-2xl bg-slate-900/30">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
                {activeTab === "VIDEO" ? <Film className="w-7 h-7" /> : <FileImage className="w-7 h-7" />}
              </div>
              <h4 className="font-bold text-sm text-white">
                {activeTab === "VIDEO" ? "No hay videos en la galería" : "No hay archivos en la galería"}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Arrastrá archivos aquí o hacé click en el botón de arriba para subir fotos o videos (hasta 50 MB).
              </p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl h-9 px-4"
              >
                <Upload className="w-4 h-4 mr-1.5" /> Seleccionar desde tu equipo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredAssets.map((asset) => {
                const isVid = isVideoAsset(asset);
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      if (onSelect) {
                        onSelect(asset.url);
                        onClose();
                      }
                    }}
                    className={`group relative rounded-2xl border border-slate-800/80 bg-slate-900/50 overflow-hidden flex flex-col justify-between transition-all ${
                      onSelect
                        ? "cursor-pointer hover:border-orange-500 hover:ring-2 hover:ring-orange-500/30 hover:scale-[1.02] active:scale-[0.98]"
                        : ""
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                      {isVid ? (
                        <>
                          <video
                            src={asset.url}
                            className="object-cover w-full h-full"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-purple-500/40 flex items-center gap-1">
                            <Play className="w-2.5 h-2.5 fill-purple-300" /> VIDEO
                          </div>
                        </>
                      ) : (
                        <Image
                          src={asset.url}
                          alt={asset.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Quick Action Buttons on hover */}
                      <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleCopyUrl(asset.url, asset.id, e)}
                          title="Copiar URL"
                          className="w-7 h-7 rounded-lg bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(asset.id, e)}
                          title="Eliminar de la galería"
                          className="w-7 h-7 rounded-lg bg-red-950/80 hover:bg-red-600 text-red-200 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Overlay selection label */}
                      {onSelect && (
                        <div className="absolute bottom-2 left-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="block w-full text-center bg-orange-600 text-white font-bold text-[10px] py-1 rounded-lg shadow-lg">
                            Usar este archivo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/60">
                      <p className="text-xs font-semibold text-slate-200 truncate" title={asset.name}>
                        {asset.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{formatBytes(asset.sizeBytes)}</span>
                        <span className="uppercase text-[9px] text-slate-400 font-bold">{asset.filename.split(".").pop()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>{filteredAssets.length} archivos disponibles</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-slate-300 hover:text-white">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

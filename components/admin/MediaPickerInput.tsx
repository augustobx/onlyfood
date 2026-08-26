"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Upload, X, Eye, Video, Film, Play } from "lucide-react";
import { MediaLibraryModal } from "./MediaLibraryModal";

interface MediaPickerInputProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  acceptType?: "ALL" | "IMAGE" | "VIDEO";
}

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") || lower.endsWith(".mkv") || lower.endsWith(".avi") || lower.endsWith(".ogg");
}

export function MediaPickerInput({
  label = "Imagen o Video",
  value = "",
  onChange,
  placeholder = "https://... o seleccioná de la galería",
  className = "",
  acceptType = "ALL",
}: MediaPickerInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isVideo = isVideoUrl(value) || acceptType === "VIDEO";

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label className="text-xs font-bold text-slate-700">{label}</Label>}

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        {/* Preview Thumbnail */}
        {value ? (
          <div className="relative w-20 h-20 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden shrink-0 group flex items-center justify-center">
            {isVideo ? (
              <>
                <video
                  src={value}
                  muted
                  playsInline
                  preload="metadata"
                  className="object-cover w-full h-full"
                />
                <div className="absolute top-1 left-1 bg-black/80 text-purple-300 text-[8px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5 pointer-events-none">
                  <Play className="w-2 h-2 fill-purple-300" /> VIDEO
                </div>
              </>
            ) : (
              <Image
                src={value}
                alt="Vista previa"
                fill
                className="object-cover"
                sizes="80px"
              />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                title="Cambiar archivo"
                className="w-6 h-6 rounded-md bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
              >
                {isVideo ? <Film className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                title="Quitar archivo"
                className="w-6 h-6 rounded-md bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsModalOpen(true)}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shrink-0 text-slate-400 hover:text-orange-600"
          >
            {acceptType === "VIDEO" ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
            <span className="text-[9px] font-bold">Elegir</span>
          </div>
        )}

        {/* Input & Action Buttons */}
        <div className="flex-1 w-full space-y-1.5">
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-9 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-9 shrink-0 text-xs font-bold bg-slate-50 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
            >
              {acceptType === "VIDEO" ? (
                <>
                  <Video className="w-4 h-4 mr-1.5 text-purple-600" />
                  Galería de Videos
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-1.5 text-orange-500" />
                  Galería
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {acceptType === "VIDEO"
                ? "Podés seleccionar videos ya subidos a la galería o subir un MP4/WEBM."
                : "Podés seleccionar archivos de la galería o pegar un enlace directo."}
            </span>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-red-500 hover:underline font-bold text-[10px]"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>

      <MediaLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(url) => onChange(url)}
        filterType={acceptType}
        title={acceptType === "VIDEO" ? "Galería de Videos (Splash & Medios)" : "Galería de Medios"}
      />
    </div>
  );
}

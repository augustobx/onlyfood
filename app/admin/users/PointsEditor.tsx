"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pen, Check, X } from "lucide-react";
import { updateUserPoints } from "@/app/actions/admin-users";
import { toast } from "sonner";

export function PointsEditor({ clientId, initialPoints }: { clientId: string, initialPoints: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [points, setPoints] = useState(initialPoints.toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    const p = parseInt(points) || 0;
    const res = await updateUserPoints(clientId, p);
    if (res.success) {
      toast.success("Puntos actualizados");
      setIsEditing(false);
    } else {
      toast.error(res.error);
    }
    setIsLoading(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-end gap-2 group">
        <span className="font-black text-yellow-600">{initialPoints} pts</span>
        <button 
          onClick={() => setIsEditing(true)} 
          className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Editar puntos"
        >
          <Pen className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Input 
        type="number" min="0" 
        value={points} onChange={(e) => setPoints(e.target.value)} 
        className="w-20 h-7 text-xs text-right font-bold text-yellow-600 pr-1 border-yellow-200" 
        autoFocus
      />
      <Button disabled={isLoading} size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={handleSave}>
        <Check className="w-4 h-4" />
      </Button>
      <Button disabled={isLoading} size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-50" onClick={() => { setIsEditing(false); setPoints(initialPoints.toString()); }}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

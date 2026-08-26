"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export function ProductDetailsClient({ product, halfSiblings = [] }: { product: any, halfSiblings?: any[] }) {
  const router = useRouter();
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  
  const [secondHalf, setSecondHalf] = useState<any>(null);
  const [comboRemovedIngredients, setComboRemovedIngredients] = useState<Record<string, string[]>>({});

  const extrasTotal = addedExtras.reduce((sum, extra) => sum + extra.price, 0);
  
  let basePrice = product.basePrice;
  if (product.allowHalf && secondHalf) {
    basePrice = (product.basePrice / 2) + (secondHalf.basePrice / 2);
  }
  const unitPrice = basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const handleIngredientToggle = (ingredientId: string, checked: boolean) => {
    if (!checked) setRemovedIngredients((prev) => [...prev, ingredientId]);
    else setRemovedIngredients((prev) => prev.filter((id) => id !== ingredientId));
  };

  const handleExtraToggle = (extra: any, checked: boolean) => {
    if (checked) setAddedExtras((prev) => [...prev, extra]);
    else setAddedExtras((prev) => prev.filter((e) => e.id !== extra.id));
  };

  const handleComboIngredientToggle = (comboItemId: string, ingredientId: string, checked: boolean) => {
    setComboRemovedIngredients(prev => {
      const current = prev[comboItemId] || [];
      if (!checked) return { ...prev, [comboItemId]: [...current, ingredientId] };
      return { ...prev, [comboItemId]: current.filter(id => id !== ingredientId) };
    });
  };

  const handleAddToCart = () => {
    if (product.onlyHalf && !secondHalf) {
      toast.error("Debes seleccionar la otra mitad");
      return;
    }

    addItem({
      product: product,
      quantity,
      removedIngredients,
      addedExtras,
      unitPrice,
      notes,
      isHalfAndHalf: !!secondHalf,
      secondHalfProduct: secondHalf,
      comboRemovedIngredients
    });

    toast.success("Agregado al carrito", {
      description: `${quantity}x ${product.name} fue agregado.`,
    });

    router.push("/");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in duration-300">
      <div className="relative">
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-black"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        
        {product.imageUrl && product.showImage ? (
          <div className="w-full h-64 md:h-96 relative bg-muted">
            <Image 
              src={product.imageUrl} 
              alt={product.name} 
              fill 
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="w-full h-64 md:h-96 bg-orange-100 flex items-center justify-center">
            <ShoppingBag className="h-20 w-20 text-orange-300" />
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {product.onlyHalf && <span className="text-orange-600 mr-2 uppercase text-sm align-middle font-bold border border-orange-200 bg-orange-50 px-2 py-0.5 rounded-full">Media</span>}
            {product.allowHalf && secondHalf ? `Mitad ${product.name} / Mitad ${secondHalf.name}` : product.name}
          </h1>
          <p className="text-muted-foreground text-lg">{product.description}</p>
        </div>

        <div className="flex items-center justify-between border-y py-6">
          <span className="text-2xl font-bold text-orange-600">
            ${unitPrice.toLocaleString('es-AR')} c/u
          </span>
          
          <div className="flex items-center gap-4 bg-muted p-1 rounded-full">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => q - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-medium text-lg">{quantity}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {product.allowHalf && (
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-xl font-semibold">Seleccioná la otra mitad</h3>
            <p className="text-sm text-muted-foreground">Obligatorio para formar la unidad completa.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {halfSiblings.map((sibling) => (
                <div 
                  key={sibling.id} 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${secondHalf?.id === sibling.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'hover:bg-slate-50'}`}
                  onClick={() => setSecondHalf(sibling)}
                >
                  <div className="font-semibold text-sm">{sibling.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">+${(sibling.basePrice / 2).toLocaleString('es-AR')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {product.isCombo && product.comboItemsConfig?.length > 0 && (
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-xl font-semibold">Personalizá tu Combo</h3>
            <div className="space-y-4">
               {product.comboItemsConfig.map((comboItem: any, idx: number) => {
                 const innerProd = comboItem.product;
                 return (
                   <div key={comboItem.id} className="border rounded-lg p-4 bg-slate-50">
                     <div className="font-semibold text-lg flex items-center justify-between">
                       <span>{innerProd.name} <span className="text-xs ml-2 bg-slate-200 px-2 py-0.5 rounded-full text-slate-700">Cant: {comboItem.quantity}</span></span>
                     </div>
                     {innerProd.ingredients?.length > 0 && (
                       <div className="mt-3 grid gap-2 pl-2">
                         {innerProd.ingredients.map((pi:any) => {
                            const ing = pi.ingredient;
                            return (
                              <div key={ing.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`ci-${comboItem.id}-ing-${ing.id}`}
                                  defaultChecked={true}
                                  disabled={!pi.isRemovable}
                                  onCheckedChange={(checked) => handleComboIngredientToggle(comboItem.id, ing.id, checked as boolean)}
                                />
                                <Label 
                                  htmlFor={`ci-${comboItem.id}-ing-${ing.id}`}
                                  className={`text-sm flex-1 cursor-pointer font-normal ${!pi.isRemovable ? "opacity-50" : ""}`}
                                >
                                  {ing.name} {!pi.isRemovable && "(No se puede quitar)"}
                                </Label>
                              </div>
                            )
                         })}
                       </div>
                     )}
                   </div>
                 )
               })}
            </div>
          </div>
        )}

        {!product.isCombo && product.ingredients?.length > 0 && (
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-xl font-semibold">Ingredientes {secondHalf && "(aplica a toda la unidad)"}</h3>
            <p className="text-sm text-muted-foreground">Destildá los que no querés.</p>
            <div className="grid gap-3">
              {product.ingredients.map((prodIng: any) => {
                const ing = prodIng.ingredient;
                return (
                <div key={ing.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`ing-${ing.id}`}
                    defaultChecked={true}
                    disabled={!prodIng.isRemovable}
                    onCheckedChange={(checked) => handleIngredientToggle(ing.id, checked as boolean)}
                  />
                  <Label 
                    htmlFor={`ing-${ing.id}`}
                    className={`text-base flex-1 cursor-pointer font-normal ${!prodIng.isRemovable ? "opacity-50" : ""}`}
                  >
                    {ing.name} {!prodIng.isRemovable && "(No se puede quitar)"}
                  </Label>
                </div>
              )})}
            </div>
          </div>
        )}

        {product.extras.length > 0 && (
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-xl font-semibold">Extras</h3>
            <p className="text-sm text-muted-foreground">Agregale lo que más te guste.</p>
            <div className="grid gap-3">
              {product.extras.map((prodExtra: any) => {
                const extra = prodExtra.extra;
                if (!extra.isActive) return null;
                
                return (
                  <div key={extra.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`extra-${extra.id}`}
                      onCheckedChange={(checked) => handleExtraToggle(extra, checked as boolean)}
                    />
                    <Label htmlFor={`extra-${extra.id}`} className="text-base flex-1 flex justify-between cursor-pointer font-normal">
                      <span>{extra.name}</span>
                      <span className="text-orange-600 font-medium">+${extra.price.toLocaleString('es-AR')}</span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Aclaraciones</h3>
          <Textarea 
            placeholder={secondHalf ? "Escribí acá si querés que le quiten algo particular a una de las mitades..." : "Escribí acá si tenés alguna aclaración..."}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        <Button 
          size="lg" 
          className="w-full text-lg h-14 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={handleAddToCart}
        >
          Agregar {quantity} al pedido • ${totalPrice.toLocaleString('es-AR')}
        </Button>
      </div>
    </div>
  );
}

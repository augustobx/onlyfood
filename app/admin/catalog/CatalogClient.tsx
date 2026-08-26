"use client";

import { useState } from "react";
import { Plus, Tag, Carrot, Sparkles, Layers, Trash2, Pen, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  addCategory, toggleCategory, deleteCategory,
  upsertProduct, toggleProduct, toggleProductImage, deleteProduct,
  addIngredient, toggleIngredient, deleteIngredient, restockIngredient,
  upsertExtra, toggleExtra, deleteExtra
} from "@/app/actions/admin-catalog";
import {
  WEEK_DAYS,
  parseAvailableDays,
  isDailyProduct,
  getProductDaysLabel,
  getProductBadgeLabel
} from "@/lib/weekly-menu";
import { MediaPickerInput } from "@/components/admin/MediaPickerInput";

export function CatalogClient({ initialCategories, allExtras, allIngredients, allCombos = [], initialTab, initialRestockId }: { initialCategories: any[], allExtras: any[], allIngredients: any[], allCombos?: any[], initialTab?: string, initialRestockId?: string }) {

  const categories = initialCategories;
  const ingredients = allIngredients;
  const extras = allExtras;
  const combos = allCombos;

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    if (typeof window !== "undefined") return localStorage.getItem("catalogActiveTab") || "products";
    return "products";
  });

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (typeof window !== "undefined") localStorage.setItem("catalogActiveTab", val);
  };

  const [newCatName, setNewCatName] = useState("");
  const [newExtra, setNewExtra] = useState({
    id: undefined as string | undefined,
    name: "",
    price: "",
    groupName: "Guarnición / Papas",
    selectionType: "SINGLE" as "SINGLE" | "MULTIPLE"
  });

  const [newIngredient, setNewIngredient] = useState({
    name: "", categoryIds: [] as string[],
    purchaseVolume: "", purchasePrice: "", yieldUnits: ""
  });
  const [restockModal, setRestockModal] = useState<string | null>(initialRestockId || null);
  const [restockForm, setRestockForm] = useState({ purchaseVolume: "", purchasePrice: "", yieldUnits: "" });

  const [newProduct, setNewProduct] = useState({
    id: undefined as string | undefined,
    name: "", basePrice: "", points: "0", description: "", categoryId: "", imageUrl: "",
    ingredientsData: [] as { id: string, quantity: number }[], extraIds: [] as string[],
    allowHalf: false, onlyHalf: false, allowRemoveIngredients: true,
    availableDays: [] as string[],
    isCombo: false, comboItemsData: [] as { id: string, quantity: number }[]
  });

  const [newCombo, setNewCombo] = useState({
    id: undefined as string | undefined,
    name: "", basePrice: "", points: "0", description: "", imageUrl: "",
    comboItemsData: [] as { id: string, quantity: number, productInfo: any }[]
  });

  const [isProductDialogOpen, setProductDialogOpen] = useState(false);
  const [isComboDialogOpen, setComboDialogOpen] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    const res = await addCategory(newCatName);
    if (res.success) { toast.success("Categoría creada"); setNewCatName(""); }
    else { toast.error("Error", { description: res.error }); }
  };
  const handleToggleCategory = async (id: string, current: boolean) => await toggleCategory(id, !current);

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredient.name || newIngredient.categoryIds.length === 0) {
      return toast.error("Selecciona un nombre y al menos una categoría");
    }
    if (!newIngredient.purchasePrice || !newIngredient.yieldUnits) {
      return toast.error("Completá el precio de compra y cuánto rinde");
    }

    const res = await addIngredient({
      name: newIngredient.name,
      categoryIds: newIngredient.categoryIds,
      purchaseVolume: newIngredient.purchaseVolume,
      purchasePrice: Number(newIngredient.purchasePrice),
      yieldUnits: Number(newIngredient.yieldUnits)
    });

    if (res.success) {
      toast.success("Ingrediente y Stock creados");
      setNewIngredient({ name: "", categoryIds: [], purchaseVolume: "", purchasePrice: "", yieldUnits: "" });
    }
    else { toast.error("Error al crear ingrediente"); }
  };

  const handleRestock = async () => {
    if (!restockModal || !restockForm.purchasePrice || !restockForm.yieldUnits) return toast.error("Completá los datos");
    const res = await restockIngredient(
      restockModal,
      Number(restockForm.purchasePrice),
      Number(restockForm.yieldUnits),
      restockForm.purchaseVolume
    );
    if (res.success) {
      toast.success("Stock actualizado y costo recalculado");
      setRestockModal(null);
      setRestockForm({ purchaseVolume: "", purchasePrice: "", yieldUnits: "" });
    }
  };

  const handleToggleIngredient = async (id: string, current: boolean) => await toggleIngredient(id, !current);

  const handleCreateExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtra.name || newExtra.price === "") return;
    const res = await upsertExtra(
      newExtra.name,
      parseFloat(newExtra.price),
      newExtra.id,
      newExtra.groupName || "Extras",
      newExtra.selectionType || "MULTIPLE"
    );
    if (res.success) {
      toast.success("Extra guardado con éxito");
      setNewExtra({ id: undefined, name: "", price: "", groupName: "Guarnición / Papas", selectionType: "SINGLE" });
    }
    else { toast.error("Error al guardar extra", { description: res.error }); }
  };
  const handleToggleExtra = async (id: string, current: boolean) => await toggleExtra(id, !current);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.basePrice || !newProduct.categoryId) return;

    const res = await upsertProduct({
      ...newProduct,
      id: newProduct.id,
      basePrice: parseFloat(newProduct.basePrice),
      suggestedCost: calculateRecipeCost(),
      points: parseInt(newProduct.points) || 0,
      availableDays: newProduct.availableDays,
      isCombo: false,
      comboItemsData: []
    });

    if (res.success) {
      toast.success("Producto guardado");
      setProductDialogOpen(false);
      setNewProduct({ id: undefined, name: "", basePrice: "", points: "0", description: "", categoryId: "", imageUrl: "", ingredientsData: [], extraIds: [], allowHalf: false, onlyHalf: false, allowRemoveIngredients: true, availableDays: [], isCombo: false, comboItemsData: [] });
    }
    else { toast.error("Error al guardar producto"); }
  };

  const handleCreateCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCombo.name || !newCombo.basePrice || newCombo.comboItemsData.length === 0) return;

    const res = await upsertProduct({
      id: newCombo.id,
      name: newCombo.name,
      basePrice: parseFloat(newCombo.basePrice),
      suggestedCost: newCombo.comboItemsData.reduce((total, item) => total + ((item.productInfo as any)?.suggestedCost || 0) * item.quantity, 0),
      points: parseInt(newCombo.points) || 0,
      description: newCombo.description,
      imageUrl: newCombo.imageUrl,
      categoryId: null,
      isCombo: true,
      allowHalf: false,
      onlyHalf: false,
      allowRemoveIngredients: true,
      ingredientsData: [],
      extraIds: [],
      comboItemsData: newCombo.comboItemsData.map(c => ({ id: c.id, quantity: c.quantity }))
    });

    if (res.success) {
      toast.success("Combo guardado");
      setComboDialogOpen(false);
      setNewCombo({ id: undefined, name: "", basePrice: "", points: "0", description: "", imageUrl: "", comboItemsData: [] });
    }
    else { toast.error("Error al guardar combo"); }
  };

  const handleToggleProduct = async (id: string, current: boolean) => await toggleProduct(id, !current);
  const handleToggleImage = async (id: string, current: boolean) => await toggleProductImage(id, !current);

  const handleDeleteProduct = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto/combo permanentemente?")) {
      const res = await deleteProduct(id);
      if (res.success) toast.success("Eliminado correctamente");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta categoría y todos sus productos?")) {
      const res = await deleteCategory(id);
      if (res.success) toast.success("Eliminada correctamente");
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (confirm("¿Eliminar este ingrediente?")) {
      const res = await deleteIngredient(id);
      if (res.success) toast.success("Eliminado correctamente");
    }
  };

  const handleDeleteExtra = async (id: string) => {
    if (confirm("¿Eliminar este extra?")) {
      const res = await deleteExtra(id);
      if (res.success) toast.success("Eliminado correctamente");
    }
  };

  const handleAddComboItem = () => {
    const sel = document.getElementById("combo-product-select") as HTMLSelectElement;
    if (!sel.value) return;
    const p = categories.flatMap(c => c.products).find(x => x.id === sel.value);
    const exists = newCombo.comboItemsData.findIndex(x => x.id === sel.value);
    if (exists >= 0) {
      const nv = [...newCombo.comboItemsData];
      nv[exists].quantity += 1;
      setNewCombo({ ...newCombo, comboItemsData: nv });
    } else {
      setNewCombo({ ...newCombo, comboItemsData: [...newCombo.comboItemsData, { id: sel.value, quantity: 1, productInfo: p }] });
    }
    sel.value = "";
  };

  const calculateRecipeCost = () => {
    return newProduct.ingredientsData.reduce((total, ingData) => {
      const ingInfo = ingredients.find((i: any) => i.id === ingData.id);
      return total + ((ingInfo?.costPerUnit || 0) * ingData.quantity);
    }, 0);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
      <TabsList className="bg-slate-100 border p-1 rounded-lg">
        <TabsTrigger value="products" className="rounded-md"><Tag className="w-4 h-4 mr-2" /> Menú y Productos</TabsTrigger>
        <TabsTrigger value="combos" className="rounded-md"><Layers className="w-4 h-4 mr-2" /> Combos</TabsTrigger>
        <TabsTrigger value="ingredients" className="rounded-md"><Carrot className="w-4 h-4 mr-2" /> Ingredientes y Stock</TabsTrigger>
        <TabsTrigger value="extras" className="rounded-md"><Sparkles className="w-4 h-4 mr-2" /> Extras Globales</TabsTrigger>
      </TabsList>

      <TabsContent value="combos" className="space-y-6 animate-in fade-in">
        <Card className="bg-slate-50 border-dashed border-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Crea un Nuevo Combo</h3>
                <p className="text-sm text-muted-foreground">Grupos de productos que se venden juntos y permiten personalización interior.</p>
              </div>

              <Button onClick={() => {
                setNewCombo({ id: undefined, name: "", basePrice: "", points: "0", description: "", imageUrl: "", comboItemsData: [] });
                setComboDialogOpen(true);
              }}><Plus className="w-4 h-4 mr-2" /> Agregar Combo</Button>
              <Dialog open={isComboDialogOpen} onOpenChange={setComboDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>Nuevo Combo</DialogTitle>
                    <DialogDescription>Define el combo y selecciona los productos que lo integran.</DialogDescription>
                  </DialogHeader>
                  <form id="add-combo" onSubmit={handleCreateCombo} className="space-y-6">

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre del Combo</Label>
                        <Input value={newCombo.name} onChange={e => setNewCombo({ ...newCombo, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio ($)</Label>
                        <Input type="number" min="0" step="0.01" value={newCombo.basePrice} onChange={e => setNewCombo({ ...newCombo, basePrice: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Puntos (Otorga)</Label>
                        <Input type="number" min="0" value={newCombo.points} onChange={e => setNewCombo({ ...newCombo, points: e.target.value })} title="Puntos para el carrito" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea value={newCombo.description} onChange={e => setNewCombo({ ...newCombo, description: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>URL de Imagen (Opcional)</Label>
                      <Input placeholder="https://..." value={newCombo.imageUrl} onChange={e => setNewCombo({ ...newCombo, imageUrl: e.target.value })} />
                    </div>

                    <div className="border-t pt-4">
                      <Label className="mb-2 block text-base font-semibold">Productos a incluir</Label>

                      <div className="flex gap-2">
                        <select className="border rounded-md px-3 text-sm flex-1 bg-white" id="combo-product-select">
                          <option value="">Selecciona un producto del cátalogo...</option>
                          {categories.flatMap(c => c.products).filter(p => !p.isCombo).map((p: any) => (
                            <option key={p.id} value={p.id}>{categories.find(c => c.id === p.categoryId)?.name}: {p.name}</option>
                          ))}
                        </select>
                        <Button type="button" onClick={handleAddComboItem} variant="secondary">Añadir</Button>
                      </div>

                      <div className="mt-4 space-y-2">
                        {newCombo.comboItemsData.length === 0 && <p className="text-xs text-muted-foreground italic p-2">No has agregado productos para este combo.</p>}
                        {newCombo.comboItemsData.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 px-3 border rounded shadow-sm bg-white">
                            <span className="font-semibold text-sm">{item.productInfo?.name || categories.flatMap(c => c.products).find(p => p.id === item.id)?.name || "Producto no disponible"}</span>
                            <div className="flex gap-3 items-center">
                              <Label className="text-xs">Cant:</Label>
                              <Input className="w-16 h-8 text-xs text-center" type="number" min="1" value={item.quantity} onChange={(e) => {
                                const nb = parseInt(e.target.value) || 1;
                                const nv = [...newCombo.comboItemsData];
                                nv[idx].quantity = nb;
                                setNewCombo({ ...newCombo, comboItemsData: nv });
                              }} />
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => {
                                setNewCombo({ ...newCombo, comboItemsData: newCombo.comboItemsData.filter((_, i) => i !== idx) });
                              }}><Tag className="h-4 w-4 rotate-45" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </form>
                  <DialogFooter>
                    <Button type="submit" form="add-combo" className="bg-purple-700 hover:bg-purple-800 text-white">Guardar Combo</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {combos.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {combos.map(combo => (
              <Card key={combo.id}>
                <CardContent className="p-5 flex gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xl">{combo.name}</h4>
                      <div className="text-right">
                        <span className="text-lg font-bold text-purple-700">${combo.basePrice.toLocaleString('es-AR')}</span>
                        {combo.points > 0 && <span className="block text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full mt-1">{combo.points} Pts</span>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{combo.description}</p>

                    <div className="mt-4 pt-3 border-t">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-2">Incluye:</span>
                      {combo.comboItemsConfig?.map((ci: any) => (
                        <div key={ci.id} className="text-sm flex items-center gap-2 mt-1">
                          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-bold">{ci.quantity}x</span>
                          <span className="font-medium text-slate-700">{ci.product?.name || categories.flatMap(c => c.products).find(p => p.id === ci.productId)?.name || "Producto no disponible"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 justify-start border-l pl-4">
                    <span className="text-xs text-muted-foreground text-center font-medium">{combo.isActive ? 'Activo' : 'Pausado'}</span>
                    <Switch checked={combo.isActive} onCheckedChange={() => handleToggleProduct(combo.id, combo.isActive)} />
                    <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50 mt-2" onClick={() => {
                      setNewCombo({
                        id: combo.id, name: combo.name, basePrice: combo.basePrice.toString(), points: combo.points.toString(), description: combo.description || "", imageUrl: combo.imageUrl || "",
                        comboItemsData: combo.comboItemsConfig?.map((ci: any) => ({
                          id: ci.productId,
                          quantity: ci.quantity,
                          productInfo: ci.product || categories.flatMap(c => c.products).find(p => p.id === ci.productId) || { name: "Producto no disponible" }
                        })) || []
                      });
                      setComboDialogOpen(true);
                    }}>
                      <Pen className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteProduct(combo.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-12 italic border rounded-xl">No hay combos registrados.</p>
        )}
      </TabsContent>

      <TabsContent value="products" className="space-y-6 animate-in fade-in">
        <Card className="bg-slate-50 border-dashed border-2">
          <CardContent className="p-6">
            <form className="flex items-end gap-4" onSubmit={handleCreateCategory}>
              <div className="flex-1 space-y-2">
                <Label>Nueva Categoría</Label>
                <Input placeholder="Ej. Hamburguesas" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              </div>
              <Button type="submit"><Plus className="w-4 h-4 mr-2" /> Agregar Categoría</Button>
            </form>
          </CardContent>
        </Card>

        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row justify-between items-center pb-2 bg-slate-50 border-b">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  {cat.name}
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <Switch checked={cat.isActive} onCheckedChange={() => handleToggleCategory(cat.id, cat.isActive)} />
                <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 h-8 w-8" onClick={() => handleDeleteCategory(cat.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setNewProduct({ id: undefined, name: "", basePrice: "", points: "0", description: "", categoryId: cat.id, imageUrl: "", ingredientsData: [], extraIds: [], allowHalf: false, onlyHalf: false, allowRemoveIngredients: true, availableDays: [], isCombo: false, comboItemsData: [] });
                  setProductDialogOpen(true);
                }}><Plus className="w-4 h-4 mr-2" /> Producto</Button>
                <Dialog open={isProductDialogOpen && newProduct.categoryId === cat.id} onOpenChange={(open) => {
                  setProductDialogOpen(open);
                  if (!open) setNewProduct({ ...newProduct, categoryId: "" });
                }}>
                  <DialogContent className="flex h-[min(860px,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-6xl flex-col overflow-hidden p-5 sm:max-w-6xl">
                    <DialogHeader className="shrink-0 border-b pb-3 pr-10">
                      <DialogTitle className="text-xl font-black">{newProduct.id ? "Editar producto" : "Agregar producto"}</DialogTitle>
                      <DialogDescription>Datos, receta y extras organizados en una vista amplia.</DialogDescription>
                    </DialogHeader>
                    <form id={`add-prod-${cat.id}`} onSubmit={handleCreateProduct} className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-5 lg:space-y-0 lg:overflow-hidden">

                      <div className="space-y-4 lg:overflow-y-auto lg:pr-2">

                      <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:grid-cols-2">
                        <div className="flex items-center space-x-2">
                          <Switch id="sw-half" checked={newProduct.allowHalf} onCheckedChange={(v) => setNewProduct({ ...newProduct, allowHalf: v, onlyHalf: false })} />
                          <Label htmlFor="sw-half" className="cursor-pointer">Permitir vender media (Mitad y Mitad)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="sw-only" checked={newProduct.onlyHalf} disabled={!newProduct.allowHalf} onCheckedChange={(v) => setNewProduct({ ...newProduct, onlyHalf: v })} />
                          <Label htmlFor="sw-only" className={`cursor-pointer ${!newProduct.allowHalf ? 'opacity-50' : ''}`}>Modo solo media</Label>
                        </div>
                        <div className="flex items-center space-x-2 sm:col-span-2">
                          <Switch id="sw-remove" checked={newProduct.allowRemoveIngredients} onCheckedChange={(v) => setNewProduct({ ...newProduct, allowRemoveIngredients: v })} />
                          <Label htmlFor="sw-remove" className="cursor-pointer text-slate-700">Permitir al cliente quitar ingredientes de la receta (ej. "Sin Tomate")</Label>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Nombre</Label>
                          <Input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Precio Base</Label>
                          <Input type="number" min="0" step="0.01" value={newProduct.basePrice} onChange={e => setNewProduct({ ...newProduct, basePrice: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Puntos (Otorga)</Label>
                          <Input type="number" min="0" value={newProduct.points} onChange={e => setNewProduct({ ...newProduct, points: e.target.value })} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea className="min-h-20 resize-none" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <MediaPickerInput
                          label="Imagen del Producto (Opcional)"
                          value={newProduct.imageUrl}
                          onChange={(url) => setNewProduct({ ...newProduct, imageUrl: url })}
                        />
                      </div>

                      {/* DISPONIBILIDAD / MENÚ SEMANAL (BOWLS / VIANDAS) */}
                      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                        <div>
                          <Label className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
                            <span>📅 Disponibilidad / Menú Semanal (Bowls, Viandas)</span>
                          </Label>
                          <p className="text-xs text-purple-700 mt-0.5">
                            Dejalo en "Todos los días" para hamburguesas regulares, o marcá los días en que se elabora este plato para que los clientes puedan encargarlo solo para ese día.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setNewProduct({ ...newProduct, availableDays: [] })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              newProduct.availableDays.length === 0
                                ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            🟢 Todos los días (Al día)
                          </button>
                          {WEEK_DAYS.map((day) => {
                            const isSelected = newProduct.availableDays.includes(day.id);
                            return (
                              <button
                                key={day.id}
                                type="button"
                                onClick={() => {
                                  const next = isSelected
                                    ? newProduct.availableDays.filter(d => d !== day.id)
                                    : [...newProduct.availableDays, day.id];
                                  setNewProduct({ ...newProduct, availableDays: next });
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                  isSelected
                                    ? "bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-300"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-200"
                                }`}
                              >
                                {isSelected ? `✓ ${day.name}` : day.name}
                              </button>
                            );
                          })}
                        </div>
                        {newProduct.availableDays.length > 0 && (
                          <p className="text-[11px] font-bold text-purple-800 bg-purple-100/70 p-2 rounded-lg border border-purple-200">
                            📌 Solo se podrá pedir o encargar para: <strong>{getProductDaysLabel(newProduct.availableDays.join(","))}</strong>.
                          </p>
                        )}
                      </div>

                      </div>

                      <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-2">

                      <div className="border-t pt-4">
                        <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                          <Label className="text-base font-semibold">Seleccionar Ingredientes de la Receta</Label>

                          {/* INDICADOR INTELIGENTE DE COSTOS Y PRECIO SUGERIDO */}
                          <div className="flex gap-4 rounded-lg border bg-slate-100 px-3 py-1.5 text-sm">
                            <div>Costo Prod: <strong className="text-red-600">${calculateRecipeCost().toFixed(2)}</strong></div>
                            <div>Venta Sugerida (x3): <strong className="text-green-600">${(calculateRecipeCost() * 3).toFixed(2)}</strong></div>
                          </div>
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {ingredients.filter((ing: any) => ing.categories.some((c: any) => c.categoryId === cat.id) && ing.isActive).map((ing: any) => {
                            const isSelected = newProduct.ingredientsData.some(i => i.id === ing.id);
                            const qty = newProduct.ingredientsData.find(i => i.id === ing.id)?.quantity || 1;
                            return (
                              <div key={ing.id} className={`flex flex-col gap-2 p-3 border rounded-lg ${isSelected ? 'bg-orange-50 border-orange-200' : 'bg-slate-50'}`}>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`ing-${ing.id}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (checked) setNewProduct({ ...newProduct, ingredientsData: [...newProduct.ingredientsData, { id: ing.id, quantity: 1 }] });
                                      else setNewProduct({ ...newProduct, ingredientsData: newProduct.ingredientsData.filter(i => i.id !== ing.id) });
                                    }}
                                  />
                                  <label htmlFor={`ing-${ing.id}`} className="text-sm font-semibold cursor-pointer">
                                    {ing.name} <span className="text-[10px] text-slate-400">(${(ing.costPerUnit || 0).toFixed(0)} c/u)</span>
                                  </label>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center space-x-2 ml-6 bg-white p-1.5 rounded border shadow-sm">
                                    <Label className="text-xs font-medium">Lleva (Uds):</Label>
                                    <Input type="number" min="0.01" step="0.01" className="h-7 w-20 text-xs px-2 text-center" value={qty} onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setNewProduct({
                                        ...newProduct,
                                        ingredientsData: newProduct.ingredientsData.map(i => i.id === ing.id ? { ...i, quantity: val } : i)
                                      });
                                    }} />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {ingredients.filter((ing: any) => ing.categories.some((c: any) => c.categoryId === cat.id)).length === 0 && (
                            <p className="text-sm text-muted-foreground italic col-span-2">No hay ingredientes asignados a esta categoría.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-slate-50/70 p-4">
                        <Label className="mb-2 block text-base font-semibold">Seleccionar Extras Posibles</Label>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {extras.filter((ext: any) => ext.isActive).map((ext: any) => (
                            <div key={ext.id} className="flex items-center space-x-2 p-2 px-3 border rounded-md">
                              <Checkbox
                                id={`ext-${ext.id}`}
                                checked={newProduct.extraIds.includes(ext.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setNewProduct({ ...newProduct, extraIds: [...newProduct.extraIds, ext.id] });
                                  else setNewProduct({ ...newProduct, extraIds: newProduct.extraIds.filter(id => id !== ext.id) });
                                }}
                              />
                              <label htmlFor={`ext-${ext.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1 flex justify-between">
                                <span>{ext.name}</span>
                                <span className="text-orange-600 font-bold">+${ext.price}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      </div>

                    </form>
                    <DialogFooter className="shrink-0">
                      <Button type="submit" form={`add-prod-${cat.id}`} className="min-w-48 bg-slate-900 font-bold text-white">Guardar producto</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {cat.products.filter((p: any) => !p.isCombo).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic">No hay productos en esta categoría.</div>
              ) : (
                <div className="divide-y relative">
                  {cat.products.filter((p: any) => !p.isCombo).map((prod: any) => (
                    <div key={prod.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-lg">{prod.name}</h4>
                          {prod.allowHalf && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">MITADES</span>}
                          {prod.onlyHalf && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">SOLO MITAD</span>}
                          {prod.availableDays && !isDailyProduct(prod.availableDays) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                              📅 {getProductBadgeLabel(prod.availableDays)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{prod.description}</p>
                        <div className="text-sm mt-1 mb-2 flex items-center gap-2">
                          <span className="font-bold text-orange-600">${prod.basePrice.toLocaleString('es-AR')}</span>
                          {' • '}
                          <span className="text-muted-foreground">{prod.ingredients?.length || 0} Ingredientes | {prod.extras?.length || 0} Extras</span>
                          {prod.points > 0 && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-700">+{prod.points} Pts</span>}
                        </div>

                        {prod.ingredients?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {prod.ingredients.map((pi: any) => (
                              <span key={pi.ingredientId} className="text-[10px] bg-slate-100 border text-slate-600 px-2 rounded-full py-0.5 font-medium">
                                {pi.ingredient.name} (Lleva {pi.quantity})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6 justify-center w-auto pr-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground text-center leading-tight uppercase font-bold">Imagen</span>
                          <Switch checked={prod.showImage} onCheckedChange={() => handleToggleImage(prod.id, prod.showImage)} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground text-center leading-tight uppercase font-bold">{prod.isActive ? 'Act.' : 'Paus.'}</span>
                          <Switch checked={prod.isActive} onCheckedChange={() => handleToggleProduct(prod.id, prod.isActive)} />
                        </div>
                        <div className="flex flex-col items-center gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50 h-8 w-8" onClick={() => {
                            setNewProduct({
                              id: prod.id, name: prod.name, basePrice: prod.basePrice.toString(), points: prod.points.toString(), description: prod.description || "", categoryId: prod.categoryId, imageUrl: prod.imageUrl || "", allowHalf: prod.allowHalf, onlyHalf: prod.onlyHalf, allowRemoveIngredients: prod.allowRemoveIngredients ?? true, availableDays: parseAvailableDays(prod.availableDays), isCombo: false,
                              ingredientsData: prod.ingredients?.map((i: any) => ({ id: i.ingredientId, quantity: i.quantity })) || [], extraIds: prod.extras?.map((e: any) => e.extraId) || [], comboItemsData: []
                            });
                            setProductDialogOpen(true);
                          }}>
                            <Pen className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 h-8 w-8" onClick={() => handleDeleteProduct(prod.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="ingredients" className="space-y-6 animate-in fade-in">
        <Card className="bg-slate-50 border-dashed border-2">
          <CardHeader className="pb-3 border-b bg-white/50">
            <CardTitle className="flex items-center gap-2">Ingresar Nuevo Ingrediente al Stock</CardTitle>
            <CardDescription>Cargá lo que compraste, cuánto te costó y cuánto te rinde. Nosotros calculamos el resto.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={handleCreateIngredient}>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Ingrediente Final</Label>
                  <Input placeholder="Ej. Medallón de Carne 150g" className="bg-white" value={newIngredient.name} onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Referencia de Compra (Opcional)</Label>
                  <Input placeholder="Ej. 100 Kg de carne picada" className="bg-white" value={newIngredient.purchaseVolume} onChange={e => setNewIngredient({ ...newIngredient, purchaseVolume: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border rounded-xl">
                <div className="space-y-2">
                  <Label className="text-slate-500">¿Cuánto pagaste en total?</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-bold">$</span>
                    <Input type="number" min="0" className="pl-8 font-bold" placeholder="Ej: 10000" value={newIngredient.purchasePrice} onChange={e => setNewIngredient({ ...newIngredient, purchasePrice: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500">¿Cuántas unidades sacás?</Label>
                  <div className="relative">
                    <Input type="number" min="1" className="pr-12 font-bold" placeholder="Ej: 100" value={newIngredient.yieldUnits} onChange={e => setNewIngredient({ ...newIngredient, yieldUnits: e.target.value })} required />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-bold">Uds.</span>
                  </div>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  {newIngredient.purchasePrice && newIngredient.yieldUnits ? (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-2 rounded-md text-center">
                      <span className="text-xs block">El costo de tu ingrediente es:</span>
                      <span className="font-black text-lg">${(Number(newIngredient.purchasePrice) / Number(newIngredient.yieldUnits)).toFixed(2)} c/u</span>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-2 rounded-md text-center text-slate-400 text-xs h-full flex items-center justify-center">Costo automático</div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label>Aplica para las categorías:</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 border rounded-md">
                  {categories.map((c: any) => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${c.id}`}
                        checked={newIngredient.categoryIds.includes(c.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setNewIngredient({ ...newIngredient, categoryIds: [...newIngredient.categoryIds, c.id] });
                          else setNewIngredient({ ...newIngredient, categoryIds: newIngredient.categoryIds.filter(id => id !== c.id) });
                        }}
                      />
                      <label htmlFor={`cat-${c.id}`} className="text-sm font-medium leading-none cursor-pointer">{c.name}</label>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-bold"><Plus className="w-5 h-5 mr-2" /> Crear Ingrediente y Sumar Stock</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Control de Stock de Ingredientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y border-t mt-2">
              {ingredients.map((ing: any) => (
                <div key={ing.id} className="p-4 flex flex-col md:flex-row justify-between md:items-center hover:bg-slate-50 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{ing.name}</h4>
                      <Badge variant={(ing.stock || 0) > 10 ? "secondary" : "destructive"}>{ing.stock || 0} en Stock</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Categorías: {ing.categories?.map((ic: any) => categories.find((c: any) => c.id === ic.categoryId)?.name).filter(Boolean).join(", ") || "Ninguna"}
                    </p>
                    <div className="text-sm mt-1 flex gap-4">
                      <span>Costo Unitario: <strong className="text-orange-600">${(ing.costPerUnit || 0).toFixed(2)}</strong></span>
                      {ing.purchaseVolume && <span className="text-muted-foreground">Ref: {ing.purchaseVolume}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-muted-foreground">{ing.isActive ? 'Activo' : 'Pausado'}</span>
                      <Switch checked={ing.isActive} onCheckedChange={() => handleToggleIngredient(ing.id, ing.isActive)} />
                    </div>
                    <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={() => setRestockModal(ing.id)}>
                      <PackagePlus className="w-4 h-4 mr-2" /> Recargar Stock
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteIngredient(ing.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {ingredients.length === 0 && <div className="p-8 text-center text-muted-foreground italic">No hay ingredientes registrados.</div>}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="extras" className="space-y-6 animate-in fade-in">
        <Card className="bg-slate-50 border-dashed border-2">
          <CardHeader>
            <CardTitle>{newExtra.id ? "Editar Extra / Opción" : "Nuevo Extra / Opción de Menú"}</CardTitle>
            <CardDescription>
              Configurá opciones individuales exclusivas (ej: Tipo de Papas, Guarnición) o agregados múltiples (ej: Bacon, Cheddar, Salsas).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateExtra}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la opción / extra</Label>
                  <Input
                    placeholder="Ej. Papas Rústicas con Romero / Extra Cheddar"
                    value={newExtra.name}
                    onChange={e => setNewExtra({ ...newExtra, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Precio adicional (+ $)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0 si está incluido"
                    value={newExtra.price}
                    onChange={e => setNewExtra({ ...newExtra, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grupo / Categoría de Opciones</Label>
                  <Input
                    placeholder="Ej. Guarnición / Papas"
                    value={newExtra.groupName}
                    onChange={e => setNewExtra({ ...newExtra, groupName: e.target.value })}
                    required
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                    {["Guarnición / Papas", "Agregados / Toppings", "Salsas", "Bebidas"].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const isSingle = preset.includes("Papas") || preset.includes("Guarnición") || preset.includes("Bebidas");
                          setNewExtra({
                            ...newExtra,
                            groupName: preset,
                            selectionType: isSingle ? "SINGLE" : "MULTIPLE"
                          });
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${newExtra.groupName === preset ? 'bg-orange-600 text-white border-orange-600 font-bold' : 'bg-white hover:bg-slate-100 text-slate-700'}`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Selección del Grupo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewExtra({ ...newExtra, selectionType: "SINGLE" })}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex flex-col gap-0.5 ${
                        newExtra.selectionType === "SINGLE"
                          ? "border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-600/20"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-1 font-black">🔘 Solo 1 (Exclusivo)</span>
                      <span className="text-[10px] font-normal text-slate-500">Ej: Tipo de Papas / Guarnición</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewExtra({ ...newExtra, selectionType: "MULTIPLE" })}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex flex-col gap-0.5 ${
                        newExtra.selectionType === "MULTIPLE"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-1 font-black">☑️ Varios (Múltiple)</span>
                      <span className="text-[10px] font-normal text-slate-500">Ej: Toppings, Salsas, Agregados</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                {newExtra.id && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewExtra({ id: undefined, name: "", price: "", groupName: "Guarnición / Papas", selectionType: "SINGLE" })}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="bg-slate-900 text-white font-bold">
                  <Plus className="w-4 h-4 mr-2" />
                  {newExtra.id ? "Actualizar Extra" : "Guardar Extra"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Extras y Opciones</CardTitle>
            <CardDescription>Opciones organizadas por grupos para que tus clientes elijan fácil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(
              extras.reduce((acc: any, ext: any) => {
                const g = ext.groupName || "Extras";
                if (!acc[g]) acc[g] = [];
                acc[g].push(ext);
                return acc;
              }, {})
            ).map(([groupName, groupExtras]: any) => {
              const isSingle = groupExtras.some((e: any) => e.selectionType === "SINGLE");
              return (
                <div key={groupName} className="rounded-2xl border bg-white overflow-hidden shadow-xs">
                  <div className="bg-slate-100/80 px-4 py-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <h3 className="font-black text-sm text-slate-900">{groupName}</h3>
                      <span className="text-xs text-slate-500">({groupExtras.length} opciones)</span>
                    </div>
                    <Badge className={isSingle ? "bg-purple-100 text-purple-800 border-purple-300 font-bold text-xs" : "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs"}>
                      {isSingle ? "🔘 Selección Única (Solo 1)" : "☑️ Selección Múltiple (Varios)"}
                    </Badge>
                  </div>

                  <div className="divide-y">
                    {groupExtras.map((ext: any) => (
                      <div key={ext.id} className="p-4 flex justify-between items-center hover:bg-slate-50/80 transition-colors">
                        <div>
                          <h4 className="font-bold text-slate-900">{ext.name}</h4>
                          <p className="text-sm font-black text-orange-600 mt-0.5">
                            {ext.price > 0 ? `+$${ext.price}` : "Incluido (Gratis)"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">{ext.isActive ? 'Activo' : 'Pausado'}</span>
                            <Switch checked={ext.isActive} onCheckedChange={() => handleToggleExtra(ext.id, ext.isActive)} />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-600 hover:bg-blue-50"
                            onClick={() => setNewExtra({
                              id: ext.id,
                              name: ext.name,
                              price: ext.price.toString(),
                              groupName: ext.groupName || "Extras",
                              selectionType: ext.selectionType || "MULTIPLE"
                            })}
                          >
                            <Pen className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteExtra(ext.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {extras.length === 0 && (
              <div className="p-12 text-center text-muted-foreground italic bg-slate-50 rounded-2xl border border-dashed">
                No hay extras ni opciones registradas. Creá tu primer extra arriba.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* RESTOCK MODAL */}
      <Dialog open={!!restockModal} onOpenChange={(open) => !open && setRestockModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recargar Stock</DialogTitle>
            <DialogDescription>Suma unidades al stock y actualiza el precio de costo del ingrediente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>¿Qué compraste? (Ref opcional)</Label>
              <Input placeholder="Ej: 10 Kg de carne" value={restockForm.purchaseVolume} onChange={e => setRestockForm({ ...restockForm, purchaseVolume: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pagué en total ($)</Label>
                <Input type="number" min="0" value={restockForm.purchasePrice} onChange={e => setRestockForm({ ...restockForm, purchasePrice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rinde (Unidades)</Label>
                <Input type="number" min="1" value={restockForm.yieldUnits} onChange={e => setRestockForm({ ...restockForm, yieldUnits: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRestock} className="w-full bg-blue-600 hover:bg-blue-700">Actualizar Stock y Costo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Tabs>
  );
}

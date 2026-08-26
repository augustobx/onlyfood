import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductDetailsClient } from "./ProductDetailsClient";

// 1. Cambiamos el tipo de params a Promise
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {

  // 2. Esperamos a que los params lleguen
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id: id }, // 3. Usamos 'id' directamente
    include: {
      ingredients: { include: { ingredient: true } },
      extras: {
        include: { extra: true }
      },
      comboItemsConfig: {
        include: {
          product: {
            include: {
              ingredients: { include: { ingredient: true } }
            }
          }
        }
      }
    }
  });

  if (!product || !product.isActive) {
    return notFound();
  }

  // Pre-fetch siblings if it's a Half to build Half-and-Half configurations
  let halfSiblings: any[] = [];
  if (product.allowHalf && !product.onlyHalf) {
    halfSiblings = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
        allowHalf: true
      },
      include: {
        ingredients: { include: { ingredient: true } }
      }
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <ProductDetailsClient product={product} halfSiblings={halfSiblings} />
    </div>
  );
}
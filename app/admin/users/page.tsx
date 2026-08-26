import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Star, Gift, Crown } from "lucide-react";
import { UsersTableClient } from "./UsersTableClient";
import { requireAdmin } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const [users, rewards, tiers] = await Promise.all([
    prisma.client.findMany({
      include: {
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, total: true },
        },
        customTier: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { points: "desc" },
    }),
    prisma.pointReward.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: "asc" }, { pointsCost: "asc" }],
    }),
    prisma.customerTier.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: "asc" }, { minSpent: "asc" }],
    }),
  ]);

  const totalPointsGiven = users.reduce((acc, u) => acc + u.points, 0);

  // Compute tier for each user
  const usersWithTiers = users.map((u) => {
    const ordersCount = u.orders.length;
    const totalSpent = u.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const points = u.points;

    let tier = u.customTier;
    if (!tier && tiers.length > 0) {
      const reverseTiers = [...tiers].sort((a, b) => b.sequence - a.sequence || b.minSpent - a.minSpent);
      tier = reverseTiers.find((t) => {
        const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
        const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
        const meetsPoints = t.minPoints === 0 || points >= t.minPoints;
        return meetsOrders && meetsSpent && meetsPoints;
      }) || tiers[0];
    }

    return {
      ...u,
      ordersCount,
      totalSpent,
      tier,
    };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" /> Base de Clientes, Insignias & Puntos
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Clientes & Membresías VIP</h2>
          <p className="text-muted-foreground text-sm">
            Consultá el historial de compras, rangos de membresía (Beaters Select, Gold, Club) y saldos de puntos.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-500">Clientes Registrados</CardTitle>
            <User className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-500">Puntos Totales Acumulados</CardTitle>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-700">🪙 {totalPointsGiven.toLocaleString("es-AR")}</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-500">Rangos de Membresía</CardTitle>
            <Crown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-900">{tiers.length} activos</div>
          </CardContent>
        </Card>
      </div>

      <UsersTableClient initialUsers={usersWithTiers} rewards={rewards} />
    </div>
  );
}

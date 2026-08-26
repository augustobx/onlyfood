import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hashUserPassword, verifyUserPassword } from '@/lib/user-auth';

describe('FASE 5: Multi-Tenant User Authentication & Memberships', () => {
  it('should hash and verify user passwords correctly', async () => {
    const password = 'SuperSecretPassword2026!';
    const hash = await hashUserPassword(password);
    
    expect(hash).toContain('scrypt$');
    expect(await verifyUserPassword(password, hash)).toBe(true);
    expect(await verifyUserPassword('WrongPassword', hash)).toBe(false);
  });

  it('should support users with distinct roles across multiple tenants', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    const email = 'multiuser@nanolabs.app';
    const passwordHash = await hashUserPassword('Password123!');

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        name: 'Carlos MultiTenant',
        isSuperAdmin: false,
        memberships: {
          create: [
            { tenantId: tenantA.id, role: 'OWNER' },
            { tenantId: tenantB.id, role: 'KITCHEN' },
          ],
        },
      },
      include: {
        memberships: true,
      },
    });

    expect(user.memberships.length).toBe(2);

    const memA = user.memberships.find((m) => m.tenantId === tenantA.id);
    const memB = user.memberships.find((m) => m.tenantId === tenantB.id);

    expect(memA?.role).toBe('OWNER');
    expect(memB?.role).toBe('KITCHEN');
  });

  it('should distinguish Platform SuperAdmin from regular tenant users', async () => {
    const superAdminEmail = 'superadmin@nanolabs.app';
    const superAdmin = await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: { isSuperAdmin: true },
      create: {
        email: superAdminEmail,
        passwordHash: await hashUserPassword('SuperNanoAdmin2026!'),
        name: 'NanoLabs Super Admin',
        isSuperAdmin: true,
      },
    });

    expect(superAdmin.isSuperAdmin).toBe(true);
  });
});

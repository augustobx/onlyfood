import { managementHandlers } from "@/lib/hub-management-http";
import { onlyfoodManagement } from "@/lib/hub-management";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, POST } = managementHandlers(onlyfoodManagement);

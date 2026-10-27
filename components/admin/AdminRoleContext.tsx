"use client";
import { createContext, useContext } from "react";
export const AdminRoleContext = createContext("STAFF");
export const useAdminRole = () => useContext(AdminRoleContext);

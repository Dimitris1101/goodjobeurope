"use client";

import ClientShell from "@/components/ClientShell";

export default function ClientShellWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientShell>{children}</ClientShell>;
}


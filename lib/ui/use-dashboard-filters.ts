"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const BOTS_PARAM = "bots";
const HIDE_BOTS_VALUE = "hide";

/**
 * Dashboard filters live in the URL, so a shared link opens the same view and the browser's
 * back button behaves. Absent parameters mean "no filter".
 */
export function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hideBots = searchParams.get(BOTS_PARAM) === HIDE_BOTS_VALUE;

  const setHideBots = useCallback(
    (hide: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (hide) params.set(BOTS_PARAM, HIDE_BOTS_VALUE);
      else params.delete(BOTS_PARAM);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { hideBots, setHideBots };
}

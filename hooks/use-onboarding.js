"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConvexQuery } from "./use-convex-query";
import { api } from "@/convex/_generated/api";

const ATTENDEE_PAGES = ["/explore", "/events", "/my-tickets"];

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { data: currentUser, isLoading} = useConvexQuery(
    api.users.getCurrentUser
  );

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) {
      setShowOnboarding(false);
      return;
    }

    const pathRequiresOnboarding = ATTENDEE_PAGES.some((page) => pathname.startsWith(page));
    const userNeedsOnboarding = !currentUser.hasCompletedOnboarding;
    setShowOnboarding(pathRequiresOnboarding && userNeedsOnboarding);
  }, [currentUser, pathname, isLoading]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    router.refresh();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    router.push("/");
  };

  return {
    showOnboarding,
    handleOnboardingComplete,
    handleOnboardingSkip,
    setShowOnboarding,
    needsOnboarding: currentUser && !currentUser.hasCompletedOnboarding,
  }
}
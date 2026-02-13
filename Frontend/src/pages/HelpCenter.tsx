/*
 * SPDX-License-Identifier: MIT
 */

import { HelpCenterViewer } from "@/features/help-center";

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Help Center</h1>
          <p className="text-sm text-white/70">
            Find guides, onboarding tips, and troubleshooting resources for your team.
          </p>
        </header>
        <HelpCenterViewer />
      </div>
    </div>
  );
};

export default HelpCenter;

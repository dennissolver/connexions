"use client";

import { useSearchParams } from "next/navigation";

export default function DemoClient() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");

  return (
    <div>
      <h1>Demo</h1>
      <p>Lead ID: {leadId}</p>
    </div>
  );
}

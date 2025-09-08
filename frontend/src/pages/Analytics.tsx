import { useEffect, useState } from "react";

export default function Analytics() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Analytics</h1>
      <p>Status: {ready ? "Ready" : "Loading..."}</p>
    </div>
  );
}

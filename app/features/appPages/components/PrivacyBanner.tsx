import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Banner } from "@shopify/polaris";

export function PrivacyBanner(props: { hasAccepted: boolean }) {
  const [dismissed, setDismissed] = useState(props.hasAccepted);
  const fetcher = useFetcher();

  useEffect(() => {
    if (props.hasAccepted) {
      setDismissed(true);
    }
  }, [props.hasAccepted]);

  useEffect(() => {
    // Auto-dismiss banner when submission succeeds
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setDismissed(true);
    }
  }, [fetcher.state, fetcher.data]);

  const handleAccept = () => {
    console.log("[PrivacyBanner] Submitting privacy acceptance");
    fetcher.submit(
      { intent: "accept_privacy" },
      { method: "post" }
    );
    // Don't dismiss immediately - wait for server response
  };

  if (dismissed) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      <Banner
        title="Privacy Policy & Terms of Service"
        tone="info"
        onDismiss={handleAccept}
      >
        <p>
          By using this app, you agree to our{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#005BD3", textDecoration: "underline" }}>
            Privacy Policy
          </a>
          . We only collect the minimum data needed for rental booking management (order IDs and rental dates). 
          We do not collect or store customer names, emails, or addresses.
        </p>
        {fetcher.state === "submitting" && <p style={{ marginTop: "10px", fontSize: "14px" }}>Saving...</p>}
        {fetcher.data?.error && <p style={{ marginTop: "10px", fontSize: "14px", color: "red" }}>{fetcher.data.error}</p>}
      </Banner>
    </div>
  );
}

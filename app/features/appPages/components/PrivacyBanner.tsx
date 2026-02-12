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

  const handleAccept = () => {
    fetcher.submit(
      { intent: "accept_privacy" },
      { method: "post", action: "/app" }
    );
    setDismissed(true);
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
      </Banner>
    </div>
  );
}

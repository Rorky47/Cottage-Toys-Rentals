export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px", fontFamily: "system-ui", lineHeight: "1.6" }}>
      <h1>Privacy Policy for NDS:RentalRates</h1>
      <p><em>Last Updated: February 12, 2026</em></p>

      <h2>1. Introduction</h2>
      <p>
        NDS:RentalRates ("the App") is a Shopify application that helps merchants manage rental pricing and bookings. 
        This privacy policy explains how we collect, use, and protect your data.
      </p>

      <h2>2. Data We Collect</h2>
      <h3>From Merchants:</h3>
      <ul>
        <li><strong>Shop Information:</strong> Shop domain and basic store settings</li>
        <li><strong>Product Data:</strong> Product IDs, titles, variants, and pricing information for rental-enabled products</li>
        <li><strong>Rental Items:</strong> Rental pricing tiers, availability calendars, and inventory settings</li>
        <li><strong>Order Data:</strong> Order IDs and line item details when customers complete rental purchases</li>
      </ul>

      <h3>From Customers (End Users):</h3>
      <ul>
        <li><strong>Rental Reservations:</strong> Rental start/end dates, product selections, and booking durations</li>
        <li><strong>Booking References:</strong> Unique booking IDs to link reservations to orders</li>
      </ul>

      <h3>Data We DO NOT Collect:</h3>
      <ul>
        <li>❌ <strong>Customer Names:</strong> We do not store or access customer names</li>
        <li>❌ <strong>Customer Email Addresses:</strong> We do not store or access customer emails</li>
        <li>❌ <strong>Customer Phone Numbers:</strong> We do not store or access phone numbers</li>
        <li>❌ <strong>Customer Addresses:</strong> We do not store or access shipping or billing addresses</li>
        <li>❌ <strong>Payment Information:</strong> We do not access or store any payment details</li>
      </ul>
      <p>
        <em>Note: Customer personal information remains in Shopify and is never transmitted to or stored by our app. 
        Merchants can view customer details by clicking "View order" links that open the Shopify admin.</em>
      </p>

      <h2>3. How We Use Your Data</h2>
      <p>We use the collected data exclusively for the following purposes:</p>
      <ul>
        <li><strong>Rental Booking Management:</strong> Confirm rental bookings when orders are paid</li>
        <li><strong>Inventory Tracking:</strong> Track rental inventory and prevent double-bookings</li>
        <li><strong>Pricing Calculation:</strong> Calculate rental pricing based on date ranges and duration</li>
        <li><strong>Calendar Display:</strong> Show rental availability calendars to merchants</li>
        <li><strong>App Functionality:</strong> Provide core rental management features</li>
      </ul>
      <p>
        <strong>We do NOT:</strong> Use customer data for marketing, analytics, advertising, 
        or any purpose other than rental booking management.
      </p>

      <h2>4. Data Storage and Security</h2>
      <ul>
        <li>All data is stored securely in encrypted databases</li>
        <li>We use Railway.app for hosting with industry-standard security practices</li>
        <li>Data is transmitted over HTTPS/TLS encrypted connections</li>
        <li>Access to data is restricted to authorized systems only</li>
      </ul>

      <h2>5. Data Sharing</h2>
      <p><strong>We do NOT sell, rent, or share customer data with any third parties.</strong></p>
      <p>We only share data as follows:</p>
      <ul>
        <li><strong>With Shopify:</strong> As required to provide app functionality via Shopify APIs</li>
        <li><strong>Service Providers:</strong> Railway.app (hosting infrastructure with encryption)</li>
        <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
      </ul>
      <p>
        <em>Service providers are bound by data protection agreements and cannot use your data 
        for their own purposes.</em>
      </p>

      <h2>6. GDPR Compliance</h2>
      <p>We comply with GDPR requirements:</p>
      <ul>
        <li><strong>Right to Access:</strong> You can request a copy of your data at any time</li>
        <li><strong>Right to Deletion:</strong> You can request deletion of your data via Shopify's customer privacy tools</li>
        <li><strong>Data Portability:</strong> We provide data in machine-readable formats upon request</li>
        <li><strong>Automated Deletion:</strong> When a shop uninstalls the app, all data is deleted within 48 hours</li>
      </ul>

      <h2>7. Data Retention</h2>
      <ul>
        <li><strong>Active Merchants:</strong> Data retained while app is installed</li>
        <li><strong>After Uninstall:</strong> All shop data deleted within 48 hours</li>
        <li><strong>Customer Requests:</strong> Customer data deleted within 48 hours of GDPR deletion request</li>
      </ul>

      <h2>8. Cookies and Tracking</h2>
      <p>
        The App does not use cookies or tracking technologies. We only use Shopify's native 
        session management for authentication.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        The App is designed for merchant use and does not knowingly collect data from children under 13.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this privacy policy from time to time. We will notify merchants of significant 
        changes via email or app notifications.
      </p>

      <h2>11. Contact Us</h2>
      <p>For questions about this privacy policy or data handling:</p>
      <ul>
        <li><strong>Email:</strong> ethanrork14@gmail.com</li>
        <li><strong>Support:</strong> Via the app's support page in Shopify Admin</li>
      </ul>

      <h2>12. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Request access to your data</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Object to processing of your data</li>
        <li>Export your data in a portable format</li>
      </ul>
      <p>To exercise these rights, contact us at the email above or use Shopify's built-in customer privacy tools.</p>
    </div>
  );
}

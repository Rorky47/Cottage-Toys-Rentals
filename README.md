## Cottage Toys Rentals

- Purpose: Embedded Shopify app to track rental products and availability.
- Dev: `npm run dev`
- Env: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SCOPES`
- Deploy: `npm run deploy`
- Extensions: `price-input` + `cart-multiplier-function`

### Deploying to Railway

Set these **environment variables** in your Railway project (Variables tab). The app will not start without them.

| Variable | Description |
|----------|-------------|
| `SHOPIFY_APP_URL` | Your app’s public URL (e.g. `https://your-app-name.up.railway.app`). **Required** – empty value causes startup to fail. |
| `SHOPIFY_API_KEY` | From your Shopify app (Partners → App → Client ID). |
| `SHOPIFY_API_SECRET` | From your Shopify app (Partners → App → Client secret). |
| `SCOPES` | Comma-separated scopes (e.g. `read_products,write_products`). |

Optional:

- `SHOP_CUSTOM_DOMAIN` – if you use a custom shop domain.

After the first deploy, set your app URL in the Shopify Partner Dashboard (App → App URL) to your Railway URL so OAuth and webhooks work.

### Public app (any store can install)

The app is configured for **App Store** distribution so it can eventually be installed by any Shopify store.

1. **Partner Dashboard**  
   In [Partners](https://partners.shopify.com) → your app → **App distribution**, choose **Public distribution**.  
   (You can’t change this later, so set it before submitting.)

2. **When you’re ready to list**  
   Create an App Store listing (description, screenshots, privacy policy, support URL), then submit for review.  
   See [Distributing your app](https://shopify.dev/docs/apps/launch/distribution) and [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements).


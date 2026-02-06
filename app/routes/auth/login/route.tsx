import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export { loader, action } from "~/features/auth/login.server";
export { default } from "~/features/auth/login";


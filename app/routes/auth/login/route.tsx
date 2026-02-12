import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export { loader, action } from "~/shared/presentation/auth/login.server";
export { default } from "~/shared/presentation/auth/login";


import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { login } from "~/shopify";
import { loginErrorMessage } from "~/routes/auth/login/error.server";

export type LoginLoaderData = {
  errors: ReturnType<typeof loginErrorMessage>;
  polarisTranslations: typeof polarisTranslations;
};

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoginLoaderData> => {
  const errors = loginErrorMessage(await login(request));

  return { errors, polarisTranslations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};


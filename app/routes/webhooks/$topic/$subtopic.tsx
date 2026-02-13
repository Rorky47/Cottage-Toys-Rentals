import type { ActionFunctionArgs } from "@remix-run/node";
import { action as ordersPaidAction } from "~/domains/booking/presentation/webhooks/ordersPaid";
import { action as ordersCancelledAction } from "~/domains/booking/presentation/webhooks/ordersCancelled";
import { action as appScopesUpdateAction } from "~/shared/presentation/webhooks/appScopesUpdate";
import { action as appUninstalledAction } from "~/shared/presentation/webhooks/appUninstalled";
import { action as customersDataRequestAction } from "~/shared/presentation/webhooks/customersDataRequest";
import { action as customersRedactAction } from "~/shared/presentation/webhooks/customersRedact";
import { action as shopRedactAction } from "~/shared/presentation/webhooks/shopRedact";
import { action as productsDeleteAction } from "~/shared/presentation/webhooks/productsDelete";

const TOPIC_ACTIONS: Record<string, (args: ActionFunctionArgs) => Promise<Response>> = {
  "orders/paid": ordersPaidAction,
  "orders/cancelled": ordersCancelledAction,
  "products/delete": productsDeleteAction,
  "app/scopes_update": appScopesUpdateAction,
  "app/uninstalled": appUninstalledAction,
  "customers/data_request": customersDataRequestAction,
  "customers/redact": customersRedactAction,
  "shop/redact": shopRedactAction,
};

export const action = async (args: ActionFunctionArgs) => {
  const topic = args.params.topic;
  const subtopic = args.params.subtopic;
  const key = `${topic}/${subtopic}`.toLowerCase();

  const handler = TOPIC_ACTIONS[key];
  if (!handler) return new Response("Not Found", { status: 404 });
  return handler(args);
};


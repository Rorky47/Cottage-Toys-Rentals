import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useParams } from "@remix-run/react";
import type { ComponentType } from "react";
import CalendarPage from "~/features/appPages/calendar";

type PageServerModule = {
  loader: (args: LoaderFunctionArgs) => Promise<unknown>;
  action: (args: ActionFunctionArgs) => Promise<unknown>;
};

type PageModule = {
  Component?: ComponentType;
};

const PAGE_MODULES: Record<string, PageModule> = {
  calendar: {
    Component: CalendarPage,
  },
};

function getPageModule(page: string | undefined): PageModule | null {
  if (!page) return null;
  return PAGE_MODULES[page] ?? null;
}

async function getServerModule(page: string | undefined): Promise<PageServerModule | null> {
  if (page === "calendar") {
    return import("~/features/appPages/calendar.server");
  }
  return null;
}

export const loader = async (args: LoaderFunctionArgs) => {
  const serverModule = await getServerModule(args.params.page);
  if (!serverModule) throw new Response("Not Found", { status: 404 });
  return serverModule.loader(args);
};

export const action = async (args: ActionFunctionArgs) => {
  const serverModule = await getServerModule(args.params.page);
  if (!serverModule) throw new Response("Method Not Allowed", { status: 405 });
  return serverModule.action(args);
};

export default function AppPage() {
  const { page } = useParams();
  const mod = getPageModule(page);
  const PageComponent = mod?.Component;
  if (!PageComponent) return null;
  return <PageComponent />;
}


import { createTRPCReact } from "@trpc/react-query";

type AppRouter = any;

export const trpc = createTRPCReact<AppRouter>();

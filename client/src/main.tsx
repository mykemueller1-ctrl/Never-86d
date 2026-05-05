import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Auth error messages that are expected when not logged in — suppress from console
const AUTH_ERROR_MESSAGES = [
  UNAUTHED_ERR_MSG,
  "Staff session required. Please log in with your PIN.",
  "Authentication required. Log in with PIN or OAuth.",
];

const isAuthError = (error: unknown): boolean => {
  if (!(error instanceof TRPCClientError)) return false;
  return AUTH_ERROR_MESSAGES.some(msg => error.message.includes(msg));
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry auth errors — they're expected before login
        if (isAuthError(error)) return false;
        return failureCount < 3;
      },
      throwOnError: false,
    },
    mutations: {
      retry: false,
    },
  },
});

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    // Silently ignore auth errors — they're expected before login
    if (isAuthError(error)) return;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (isAuthError(error)) return;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

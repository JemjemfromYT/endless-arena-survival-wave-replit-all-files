import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Premium from "@/pages/premium";
import Success from "@/pages/success";
import Cancel from "@/pages/cancel";

const queryClient = new QueryClient();

function GameRedirect() {
  window.location.replace("/game/index.html");
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={GameRedirect} />
      <Route path="/premium" component={Premium} />
      <Route path="/success" component={Success} />
      <Route path="/cancel" component={Cancel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

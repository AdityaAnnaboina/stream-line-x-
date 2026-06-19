import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthButton } from "./components/global/auth-buttons";
import { Widget } from "./components/global/widget";
import { ControlLayout } from "./layouts/control-layout";

const client = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={client}>
      <ControlLayout>
        <AuthButton />
        <Widget />
      </ControlLayout>
      <Toaster />
    </QueryClientProvider>
  );
};

export default App;

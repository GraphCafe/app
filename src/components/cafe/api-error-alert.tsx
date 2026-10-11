import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ApiErrorAlert({
  title = "Request failed",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

import { Badge } from "@/components/ui/badge";
import { DeliveryRouteStatus, DeliveryStopStatus, DeliveryItemStatus } from "@/types";

const statusClasses: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-sky-100 text-sky-800 border-sky-200",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  en_route: "bg-blue-100 text-blue-800 border-blue-200",
  arrived: "bg-violet-100 text-violet-800 border-violet-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  returned: "bg-orange-100 text-orange-800 border-orange-200",
  damaged: "bg-red-100 text-red-800 border-red-200",
  failed: "bg-rose-100 text-rose-800 border-rose-200",
  skipped: "bg-zinc-200 text-zinc-700 border-zinc-300",
  cancelled: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

type Props = {
  status: DeliveryRouteStatus | DeliveryStopStatus | DeliveryItemStatus | string;
};

export default function DeliveryStatusBadge({ status }: Props) {
  return (
    <Badge className={`border ${statusClasses[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"}`}>
      {status}
    </Badge>
  );
}

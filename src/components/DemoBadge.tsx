import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

export function DemoBadge() {
  const { esModoDemo } = useAuth();
  if (!esModoDemo) return null;

  return (
    <Badge variant="warning" title="Datos de demostracion, no son informacion real">
      Demo
    </Badge>
  );
}

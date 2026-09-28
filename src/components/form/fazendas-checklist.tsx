import { Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Fazenda } from "@/lib/api/types";
import styles from "./fazendas-checklist.module.css";

/** Multi-seleção de fazendas (relacionamento N:N vendedor ↔ fazenda). */
export function FazendasChecklist({
  fazendas,
  selected,
  onChange,
}: {
  fazendas: Fazenda[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  if (fazendas.length === 0) {
    return <p className={styles.empty}>Nenhuma fazenda cadastrada.</p>;
  }

  return (
    <div className={styles.list}>
      {fazendas.map((fazenda) => (
        <label key={fazenda.fazenda_id} className={cn(styles.item, "glass-panel")}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={selected.includes(fazenda.fazenda_id)}
            onChange={() => toggle(fazenda.fazenda_id)}
          />
          <Warehouse size={16} className={styles.icon} />
          <span className={styles.name}>{fazenda.nome_fazenda}</span>
          <span className={styles.meta}>{fazenda.municipio}</span>
        </label>
      ))}
    </div>
  );
}

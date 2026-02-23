import * as React from "react";
import {
  DataGrid,
  type DataGridProps,
  GridRow,
  type GridRowProps,
} from "@mui/x-data-grid";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type GridRowWithId = {
  id: string | number;
};

export type ReorderableGridProps<TRow extends GridRowWithId> = Omit<
  DataGridProps<TRow>,
  "rows"
> & {
  rows: TRow[];
  onRowsChange: (rows: TRow[]) => void;
};

const DraggableRow = React.forwardRef<HTMLDivElement, GridRowProps>(
  function DraggableRow(props, ref) {
    const { rowId, style, ...other } = props;

    const {
      setNodeRef,
      attributes,
      listeners,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: rowId });

    return (
      <GridRow
        rowId={rowId}
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        style={{
          ...style,
          transform: CSS.Transform.toString(transform),
          transition,
          cursor: "grab",
          userSelect: "none",
          opacity: isDragging ? 0.5 : 1,
        }}
        {...attributes}
        {...listeners}
        {...other}
      />
    );
  },
);

export function ReorderableGrid<TRow extends GridRowWithId>(
  props: ReorderableGridProps<TRow>,
) {
  const { rows, onRowsChange, ...gridProps } = props;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);

    onRowsChange(arrayMove(rows, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={rows.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        <DataGrid {...gridProps} rows={rows} slots={{ row: DraggableRow }} />
      </SortableContext>
    </DndContext>
  );
}

export default ReorderableGrid;

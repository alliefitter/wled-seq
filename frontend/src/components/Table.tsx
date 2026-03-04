import { DataGrid, type DataGridProps } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import type { ListResponse } from "../types/api";
import { useCursorPagination } from "../hooks/useTableData.tsx";
import { Typography } from "@mui/material";

interface TableProps<T, F> extends DataGridProps {
  listItems: (
    filters: F,
    limit: number,
    cursor: string | null,
  ) => Promise<ListResponse<T[]>>;
  fetchPrerequisites?: () => void;
  filters: F;
}

function Table<T, F>({
  listItems,
  fetchPrerequisites,
  filters,
  ...props
}: TableProps<T, F>) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const {
    rows,
    loading,
    rowCount,
    paginationModel,
    onPaginationModelChange,
    error,
  } = useCursorPagination<T, F>({
    listItems,
    filters,
  });

  useEffect(() => {
    if (loading && fetchPrerequisites) {
      fetchPrerequisites();
    }
  }, [setIsLoading, fetchPrerequisites, loading]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading, setIsLoading]);

  return error ? (
    <Typography variant="h1">{error}</Typography>
  ) : (
    <DataGrid
      loading={isLoading}
      rows={rows}
      rowCount={rowCount}
      paginationMode="server"
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
      {...props}
    />
  );
}

export default Table;

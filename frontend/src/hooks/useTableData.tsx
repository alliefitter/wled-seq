import { useCallback, useEffect, useRef, useState } from "react";
import type { ListResponse } from "../types/api";

type UseCursorPaginationOptions<T, F> = {
  listItems: (
    filters: F,
    limit: number,
    cursor: string | null,
  ) => Promise<ListResponse<T[]>>;
  filters: F;
  initialPageSize?: number;
};

export function useCursorPagination<T, F>({
  listItems,
  filters,
  initialPageSize = 10,
}: UseCursorPaginationOptions<T, F>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [rowCount, setRowCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const cursorHistory = useRef<Record<number, string | null>>({
    0: null,
  });

  const fetchPage = useCallback(
    async (pageIndex: number) => {
      setLoading(true);

      const cursor = cursorHistory.current[pageIndex] ?? null;

      const params = new URLSearchParams({
        limit: pageSize.toString(),
      });

      if (cursor) {
        params.append("cursor", cursor);
      }

      const data = await listItems(filters, pageSize, cursor);

      setRows(data.items);
      setRowCount(data.total);

      if (data.next_page) {
        cursorHistory.current[pageIndex + 1] = data.next_page;
      }

      if (data.previous_page) {
        cursorHistory.current[pageIndex - 1] = data.previous_page;
      }

      setLoading(false);
    },
    [listItems, filters, pageSize],
  );

  useEffect(() => {
    fetchPage(page).catch((e) => setError(e));
  }, [page, pageSize, fetchPage]);

  useEffect(() => {
    cursorHistory.current = {
      0: null,
    };
    setPage(0);
  }, [cursorHistory, filters, setPage]);

  const handlePaginationChange = useCallback(
    (model: { page: number; pageSize: number }) => {
      if (model.pageSize !== pageSize) {
        cursorHistory.current = { 0: null };
        setPage(0);
        setPageSize(model.pageSize);
      } else {
        setPage(model.page);
      }
    },
    [pageSize],
  );

  return {
    rows,
    loading,
    rowCount,
    paginationModel: { page, pageSize },
    onPaginationModelChange: handlePaginationChange,
    error,
  };
}

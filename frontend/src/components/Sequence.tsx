import { useParams } from "react-router-dom";
import { getSequence } from "../api.ts";
import { useEffect, useState } from "react";
import type { SequenceResponse } from "../types/api";
import Editor from "./Editor.tsx";

function Sequence() {
  const params = useParams();
  const [data, setData] = useState<SequenceResponse | null>(null);
  useEffect(() => {
    if (params.id) {
      getSequence(params.id).then((response) => setData(response));
    }
  }, [params]);
  return data ? <Editor mode="view" value={data} /> : null;
}

export default Sequence;

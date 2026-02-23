import { useParams } from "react-router-dom";
import Editor from "./Editor.tsx";

function Sequence() {
  const params = useParams();
  return <Editor mode="view" id={params?.id} />;
}

export default Sequence;

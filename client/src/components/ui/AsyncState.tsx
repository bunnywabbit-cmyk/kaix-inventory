import { Loader2, TriangleAlert } from "lucide-react";

interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  loadingLabel?: string;
}

function AsyncState({ loading, error, loadingLabel = "Loading..." }: AsyncStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-10 text-center text-sm dark:border-red-500/30 dark:bg-red-500/10">
        <TriangleAlert className="size-5 text-red-600 dark:text-red-400" />
        <p className="font-medium text-red-700 dark:text-red-400">Couldn't load data</p>
        <p className="text-red-600/80 dark:text-red-400/70">{error}</p>
      </div>
    );
  }

  return null;
}

export default AsyncState;

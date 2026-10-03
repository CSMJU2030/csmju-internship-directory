"use client";

import ErrorState from "../../components/shared/ErrorState";

export default function SegmentError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorState retry={retry} digest={error.digest} />;
}

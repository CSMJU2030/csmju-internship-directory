import { sameSitePath } from "../../lib/sign-in";
import ReSignIn from "../_components/ReSignIn";

export const dynamic = "force-dynamic";

/**
 * Where a form action goes when the backend answered 401 (see actions.ts): a
 * server action cannot navigate the top-level page itself, so it lands here,
 * and the user is asked - not sent away - before signing in again. `next` is
 * the page the form was on, with a message saying why it is empty again.
 */
export default async function SignInAgainPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <ReSignIn next={sameSitePath(next)} ask />;
}

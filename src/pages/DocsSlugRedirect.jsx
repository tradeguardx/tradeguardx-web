import { Navigate, useParams } from 'react-router-dom';
import { HELP_ARTICLES } from '../lib/exchangeDocs';

/**
 * /docs/:slug → /help/:slug, keeping the slug.
 *
 * The old route was `<Navigate to="/help" replace />`, which threw the slug
 * away: every deep link anyone had ever saved or published — /docs/kill-switch,
 * /docs/cooldowns — landed on the first article instead of the one it named.
 * Silent, and indistinguishable from the page having moved.
 *
 * `getting-started` is the one slug with no counterpart: it was the per-venue
 * setup guide, and there are now three of those. /exchanges is the honest
 * destination, because picking one venue's guide for a request that did not
 * name a venue is a guess.
 *
 * The real 301 for crawlers lives in vercel.json, at the edge, before the SPA
 * ever loads. This component is the in-app fallback for a client-side
 * navigation, which never touches the edge rules.
 */
export default function DocsSlugRedirect() {
  const { slug } = useParams();
  const known = HELP_ARTICLES.some((a) => a.slug === slug);
  return <Navigate to={known ? `/help/${slug}` : '/exchanges'} replace />;
}

/* WHAT ACTUALLY TOUCHES A READER'S DATA.
 *
 * Modelled deliberately on affiliate.mjs, for the identical reason. That file
 * exists because the footer claimed an Amazon relationship we did not have —
 * a factual claim about ourselves, written in advance so it "could not be
 * forgotten", which produced a false statement on 63 pages. A privacy policy
 * is the same kind of claim and fails the same two ways:
 *
 *   TOO GENEROUS   "we use cookies to improve your experience" on a site that
 *                  sets none. Copied from a generator, describing someone
 *                  else's site.
 *   TOO CONFIDENT  "we collect nothing" left standing on the day analytics is
 *                  switched on. This is the one that actually matters here,
 *                  because Frank has said analytics is coming. A policy that
 *                  is true today and silently false next month is worse than a
 *                  vague one, because people rely on it.
 *
 * So the page is DERIVED from this file. Flip `live` when a thing is real and
 * the policy rewrites itself; leave it off and the page says so plainly. The
 * guard in __tests__/privacy-truth.test.mjs closes the loop from the other
 * side: if an analytics vendor appears in the built HTML while nothing here is
 * live, the build fails rather than shipping a policy that lies.
 *
 * A NOTE ON WHAT BEING STATIC DOES AND DOESN'T BUY US. An earlier draft of the
 * page said collecting nothing was "not a policy decision we might quietly
 * reverse — it is a consequence of the site being a set of static files with
 * no server to receive anything." Frank flagged it, and he was right: it is
 * false. Client-side analytics on a static site is the ordinary case, and
 * needs no backend of ours at all. Being static prevents nothing. It is a
 * choice, and it is about to change — so the page must describe it as a
 * choice.
 */

/** Every party that processes reader data, and whether it is actually on. */
export const PROCESSORS = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    live: true,
    role: 'Hosting and content delivery',
    /* Unavoidable: someone has to serve the bytes, and serving them means
       receiving a request that carries an IP address. Under UK/EU law an IP
       address is personal data, so this is disclosed even though we neither
       add to those logs nor read them. */
    processes: 'Standard request logs, which include IP address, timestamp, the page requested, and browser user-agent.',
    why: 'Delivering the site, and protecting it from abuse and denial-of-service traffic.',
    basis: 'Legitimate interests — running a website securely and reliably.',
    link: 'https://www.cloudflare.com/privacypolicy/',
  },
  {
    id: 'backend',
    /* NOT LIVE. Frank: "we will have a backend with some server functions",
       "just not now."
       This one is listed because of what it would INVALIDATE, not because of
       what it adds. Today the strongest true sentence on the page is that the
       trip you type in never reaches us — and it is true only because there is
       nothing of ours for it to reach. The moment a server function exists,
       that sentence needs re-earning: a request to it carries the trip, and
       possibly whatever else is in the URL. So the page asks this flag before
       making the claim, rather than leaving a sentence that quietly stops
       being true on the day the first endpoint ships. */
    name: null,
    live: false,
    role: 'Our own server functions',
    processes: null,
    why: 'Features that cannot run in the browser alone.',
    basis: null,
    link: null,
  },
  {
    id: 'analytics',
    /* NOT LIVE. Frank: "we will have analytics soon", "just don't now."
       Named rather than omitted so the page can state its absence as a fact
       about today, and so the section that describes it already exists when it
       is switched on. Filling in `name`, `processes` and `link` at the same
       time as `live: true` is the whole job. */
    name: null,
    live: false,
    role: 'Analytics',
    processes: null,
    why: 'Understanding which pages are used, in aggregate.',
    basis: null,
    link: null,
  },
];

/** Everything this site puts in a reader's browser. */
export const BROWSER_STORAGE = [
  {
    key: 'units',
    kind: 'localStorage',
    holds: 'Whether you chose metric or imperial.',
    /* Why no consent banner: this is a preference the reader set themselves by
       operating a visible control, it identifies nobody, and it is read only
       to render the page the way they asked. Under PECR / the ePrivacy rules
       that is "strictly necessary" territory. Adding analytics does NOT
       inherit this exemption. */
    why_no_consent: 'You set it yourself using the metric/imperial control, it identifies nobody, and it never leaves your browser.',
  },
];

/* Nobody has to fill these in for the site to work, which is exactly why they
   get forgotten. A privacy policy with no way to reach the publisher is not a
   privacy policy — GDPR Art. 13 requires the controller's identity and contact
   details — so the page says so out loud rather than quietly omitting it. */
export const CONTROLLER = null; // e.g. 'Frank Young, sole trader, United Kingdom'
export const CONTACT = null; // e.g. 'privacy@sizer.example'

const isLive = (id) => PROCESSORS.some((p) => p.id === id && p.live);

export const analyticsLive = () => isLive('analytics');
export const backendLive = () => isLive('backend');
export const activeProcessors = () => PROCESSORS.filter((p) => p.live);

/**
 * Do we collect anything ourselves, as opposed to our host receiving it?
 *
 * The distinction is the honest heart of this page today. "We collect nothing"
 * is true of us and would be misleading full stop, because a request still
 * reaches Cloudflare and still carries an IP.
 */
export const weCollect = () => analyticsLive() || backendLive();

/** Known analytics vendors, for the guard. Presence of any of these in built
 *  HTML while `analytics.live` is false means the policy has gone stale — the
 *  exact failure this whole file exists to prevent. */
export const ANALYTICS_SIGNATURES = [
  'googletagmanager.com',
  'google-analytics.com',
  'gtag(',
  'plausible.io',
  'static.cloudflareinsights.com',
  'beacon.min.js',
  'umami',
  'posthog',
  'segment.com/analytics.js',
  'fathom',
  'matomo',
  'hotjar',
  'clarity.ms',
  'mixpanel',
];

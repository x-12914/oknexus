import "server-only";
import Apple from "next-auth/providers/apple";
import Coinbase from "next-auth/providers/coinbase";
import Discord from "next-auth/providers/discord";
import Facebook from "next-auth/providers/facebook";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import Twitter from "next-auth/providers/twitter";
import type { Provider } from "next-auth/providers";

/**
 * Social ("continue with …") sign-in.
 *
 * Every provider is OPT-IN: it only appears on the login page once its client id
 * and secret are present in the environment, so a half-configured provider can
 * never render a button that dead-ends at the OAuth screen. Each one accepts the
 * Auth.js convention (`AUTH_GOOGLE_ID`) or the older one already used in this
 * repo's .env.example (`GOOGLE_CLIENT_ID`).
 *
 * Callback URL to register with each provider:
 *   https://oknexusexchange.com/api/auth/callback/<id>
 *   http://localhost:3000/api/auth/callback/<id>   (local dev)
 */

export interface SocialProviderInfo {
  /** Auth.js provider id — also the last path segment of the callback URL. */
  id: string;
  /** Button label, e.g. "Continue with {label}". */
  label: string;
}

interface SocialProviderDefinition extends SocialProviderInfo {
  /** `AUTH_<X>_ID` / `AUTH_<X>_SECRET`. */
  envPrefix: string;
  /** Legacy `<X>_CLIENT_ID` / `<X>_CLIENT_SECRET`. */
  legacyEnvPrefix: string;
  /**
   * True when the provider only ever hands back an address it has verified
   * itself. Those providers may auto-link to an existing OKNexus account with
   * the same email; the rest must not, or anyone who can create an account with
   * someone else's address at that provider could take over their exchange login.
   */
  verifiesEmail: boolean;
  build: (options: {
    clientId: string;
    clientSecret: string;
    allowDangerousEmailAccountLinking: boolean;
  }) => Provider;
}

const DEFINITIONS: SocialProviderDefinition[] = [
  {
    id: "google",
    label: "Google",
    envPrefix: "AUTH_GOOGLE",
    legacyEnvPrefix: "GOOGLE_CLIENT",
    verifiesEmail: true,
    build: (o) => Google(o),
  },
  {
    id: "apple",
    label: "Apple",
    envPrefix: "AUTH_APPLE",
    legacyEnvPrefix: "APPLE_CLIENT",
    verifiesEmail: true,
    build: (o) => Apple(o),
  },
  {
    id: "facebook",
    label: "Facebook",
    envPrefix: "AUTH_FACEBOOK",
    legacyEnvPrefix: "FACEBOOK_CLIENT",
    verifiesEmail: true,
    build: (o) => Facebook(o),
  },
  {
    id: "github",
    label: "GitHub",
    envPrefix: "AUTH_GITHUB",
    legacyEnvPrefix: "GITHUB_CLIENT",
    verifiesEmail: true,
    build: (o) => GitHub(o),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    envPrefix: "AUTH_LINKEDIN",
    legacyEnvPrefix: "LINKEDIN_CLIENT",
    verifiesEmail: true,
    build: (o) => LinkedIn(o),
  },
  {
    id: "coinbase",
    label: "Coinbase",
    envPrefix: "AUTH_COINBASE",
    legacyEnvPrefix: "COINBASE_CLIENT",
    verifiesEmail: true,
    build: (o) => Coinbase(o),
  },
  {
    id: "discord",
    label: "Discord",
    envPrefix: "AUTH_DISCORD",
    legacyEnvPrefix: "DISCORD_CLIENT",
    // Discord reports a `verified` flag on the profile, which the sign-in
    // callback checks — but an unverified Discord account can still hold any
    // address, so never auto-link on email alone.
    verifiesEmail: false,
    build: (o) => Discord(o),
  },
  {
    id: "twitter",
    label: "X",
    envPrefix: "AUTH_TWITTER",
    legacyEnvPrefix: "TWITTER_CLIENT",
    // X only returns an email at all with elevated API access, and never says
    // whether it is verified.
    verifiesEmail: false,
    build: (o) => Twitter(o),
  },
];

function credentialsFor(
  def: SocialProviderDefinition,
): { clientId: string; clientSecret: string } | null {
  const clientId =
    process.env[`${def.envPrefix}_ID`] ?? process.env[`${def.legacyEnvPrefix}_ID`];
  const clientSecret =
    process.env[`${def.envPrefix}_SECRET`] ?? process.env[`${def.legacyEnvPrefix}_SECRET`];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** Auth.js provider instances for every social login that is fully configured. */
export function socialAuthProviders(): Provider[] {
  const providers: Provider[] = [];
  for (const def of DEFINITIONS) {
    const creds = credentialsFor(def);
    if (!creds) continue;
    providers.push(
      def.build({ ...creds, allowDangerousEmailAccountLinking: def.verifiesEmail }),
    );
  }
  return providers;
}

/** The ids + labels to render buttons for. Safe to hand to a client component. */
export function enabledSocialProviders(): SocialProviderInfo[] {
  return DEFINITIONS.filter((d) => credentialsFor(d) !== null).map((d) => ({
    id: d.id,
    label: d.label,
  }));
}

export function socialProviderDefinition(id: string): SocialProviderDefinition | undefined {
  return DEFINITIONS.find((d) => d.id === id);
}

/** Display label for a provider id, falling back to the raw id for unknown ones. */
export function socialProviderLabel(id: string): string {
  return socialProviderDefinition(id)?.label ?? id;
}

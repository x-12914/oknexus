import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | OKNexus Exchange",
  description:
    "The terms that govern your use of the OKNexus Exchange platform, including eligibility, verification, risk and prohibited use.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "These terms",
    blocks: [
      "These Terms of Service are an agreement between you and {{Legal entity name}}, registered at {{Registered address}}, which operates OKNexus Exchange. By creating an account or using the platform you accept them. If you do not accept them, do not use the platform.",
      "Please read them alongside our Privacy Policy, which explains how we handle your information.",
    ],
  },
  {
    heading: "Who may use the platform",
    blocks: [
      "You may open an account only if you are at least 18 years old, have the legal capacity to enter this agreement, and are acting for yourself rather than on someone else's behalf unless we have agreed otherwise in writing.",
      "You may not use the platform if you are resident in, or accessing it from, a country subject to comprehensive sanctions, or if you appear on any applicable sanctions list. Availability varies by country and we may decline or restrict service in any jurisdiction, including {{Restricted jurisdictions}}.",
      "Nothing on the platform is investment, tax or legal advice, and no content on it is a recommendation to buy or sell any asset.",
    ],
  },
  {
    heading: "Your account",
    blocks: [
      "You must give us accurate information and keep it up to date. You are responsible for everything that happens under your account, for keeping your password and two-factor device secure, and for telling us immediately if you suspect unauthorised access.",
      "We strongly recommend enabling two-factor authentication. Where it is enabled, it is also required when you sign in with a social provider such as Google.",
      "One person may hold one account. Accounts are not transferable.",
    ],
  },
  {
    heading: "Identity verification",
    blocks: [
      "Before you can use certain features or trade above certain limits, you must complete identity verification. We may ask for further information or documents at any time, including the source of your funds, and we may pause activity on your account until we receive them.",
      "We may refuse, suspend or close an account where verification is incomplete, where information appears inaccurate, or where we are required to do so by law.",
    ],
  },
  {
    heading: "The services",
    blocks: [
      "Subject to these terms and to your verification level, the platform gives you access to spot trading, instant swaps, buying and selling crypto with fiat currency, an OTC desk, a peer-to-peer marketplace, and a hosted wallet with deposits and withdrawals.",
      "We may add, change, suspend or withdraw any part of the platform. We aim to give notice where a change materially affects you, but we may act immediately where security, stability or the law requires it.",
      "We do not guarantee that the platform will be available without interruption. Markets can move sharply, and orders may not execute at the price shown when volatility or a network problem prevents it.",
    ],
  },
  {
    heading: "Beta features and test networks",
    blocks: [
      "Parts of the platform are still in development. Some blockchain functionality currently runs against test networks rather than main networks, and some accounts may be credited with demonstration balances for evaluation purposes.",
      "Demonstration balances and test-network assets are not real assets. They have no monetary value, they cannot be withdrawn or exchanged for anything of value, and we may adjust or remove them at any time. Where a feature is marked as beta, coming soon or in testing, it is provided as-is and should not be relied on.",
    ],
  },
  {
    heading: "Risk disclosure",
    blocks: [
      "Trading digital assets carries significant risk. You should not trade with money you cannot afford to lose. In particular:",
      {
        list: [
          "Prices are highly volatile and can fall as well as rise. You may lose the entire value of your holdings.",
          "Digital assets are not legal tender in most jurisdictions and are not covered by deposit insurance or investor compensation schemes.",
          "Blockchain transactions are irreversible. A withdrawal sent to a wrong or incompatible address cannot be recovered.",
          "Networks can congest, fork or fail, which can delay or prevent deposits and withdrawals.",
          "Losing access to your password or two-factor device may mean losing access to your account.",
          "Regulatory change can affect the availability, tax treatment or legality of digital assets where you live.",
        ],
      },
      "You are solely responsible for your trading decisions and for any tax you owe.",
    ],
  },
  {
    heading: "Peer-to-peer trading",
    blocks: [
      "In the peer-to-peer marketplace you deal directly with another user. That user, not OKNexus, is your counterparty. We provide the venue and hold the crypto side of the trade in escrow, releasing it when the agreed conditions are met.",
      "We do not process, hold or verify the fiat payment between you and your counterparty. Do not release escrow until you have confirmed that payment has actually cleared into your account.",
      "If a trade is disputed, we will review the evidence and messages within that order and decide whether to release the escrowed funds to the buyer or return them to the seller. That decision is final as far as the escrow is concerned and does not affect any rights you have against the other user.",
    ],
  },
  {
    heading: "Fees",
    blocks: [
      "Fees are shown before you confirm a transaction and are deducted at the point of execution. Blockchain network fees and third-party payment fees are additional and outside our control. Quoted rates for swaps, purchases and OTC trades hold for a short window only and expire if not accepted in time.",
      "Our current fee schedule is available at {{Fee schedule location}} and may change on notice.",
    ],
  },
  {
    heading: "Things you must not do",
    blocks: [
      {
        list: [
          "Use the platform for money laundering, terrorist financing, fraud, or any other unlawful purpose.",
          "Trade on behalf of a sanctioned person, or evade sanctions, tax or currency controls.",
          "Manipulate a market, including wash trading, spoofing, or coordinating trades to create a false impression of activity.",
          "Give false information, use someone else's identity, or open more than one account without our agreement.",
          "Use bots, scrapers or automated tools against the platform except through an interface we provide for that purpose, or attempt to disrupt, probe or gain unauthorised access to our systems.",
          "Infringe our intellectual property or that of anyone else.",
        ],
      },
    ],
  },
  {
    heading: "Suspension and closure",
    blocks: [
      "We may suspend, restrict or close your account, and freeze balances on it, where we reasonably believe you have breached these terms, where we are required to by law or by a regulator, where there are signs of fraud or unauthorised access, or where we are investigating any of those things.",
      "Where we can lawfully do so, we will tell you why and for how long. You may close your account at any time, provided it holds no open positions or outstanding obligations. Closure does not affect records we are required to keep.",
    ],
  },
  {
    heading: "Intellectual property",
    blocks: [
      "The platform, its software, design, branding and content belong to us or our licensors. We grant you a personal, non-exclusive, non-transferable and revocable licence to use the platform for its intended purpose. You may not copy, modify, reverse engineer, resell or create derivative works from it.",
    ],
  },
  {
    heading: "Disclaimers and liability",
    blocks: [
      "To the fullest extent permitted by law, the platform is provided as-is and as-available, and we exclude all implied warranties, including fitness for a particular purpose and uninterrupted availability.",
      "We are not liable for losses caused by market movements, your own trading decisions, a counterparty's conduct, a blockchain network, a third-party provider, or your failure to keep your credentials secure. We are not liable for indirect or consequential loss, or for loss of profit, revenue, goodwill or opportunity.",
      "Our total liability to you in connection with the platform is limited to {{Liability cap}}. Nothing in these terms excludes liability for fraud, or for anything else that cannot be excluded by law.",
      "You agree to indemnify us against claims, losses and costs arising from your breach of these terms or your unlawful use of the platform.",
    ],
  },
  {
    heading: "Changes to these terms",
    blocks: [
      "We may update these terms. The date at the top shows the current version. Where a change materially affects your rights we will give you notice before it takes effect. Continuing to use the platform after that means you accept the updated terms.",
    ],
  },
  {
    heading: "Governing law and disputes",
    blocks: [
      "These terms are governed by the laws of {{Governing jurisdiction}}, and the courts of {{Governing jurisdiction}} have exclusive jurisdiction over any dispute, subject to any mandatory right you have to bring proceedings where you live.",
      "Before starting proceedings, please contact us at {{support@oknexusexchange.com}} or through the Help Center so we can try to resolve the matter with you directly.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      draft
      title="Terms of Service"
      updated="22 August 2026"
      intro="These terms govern your use of OKNexus Exchange. They cover who may open an account, what we provide, the risks of trading digital assets, and what happens when something goes wrong."
      sections={SECTIONS}
    />
  );
}

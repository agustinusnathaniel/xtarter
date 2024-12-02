/** @type {import('next-seo').DefaultSeoProps} */
const defaultSEOConfig = {
  title: "starter templates",
  titleTemplate: "%s | xtarter",
  defaultTitle: "xtarter",
  description: "Starter templates to quickly launch your projects",
  canonical: "https://xtarter.sznm.dev",
  openGraph: {
    url: "https://xtarter.sznm.dev",
    title: "xtarter",
    description: "starter templates",
    images: [
      {
        url: "https://og.sznm.dev/api/generate?heading=xtarter&text=https://xtarter.sznm.dev%20|%20Starter%20Templates",
        alt: "xtarter.sznm.dev og-image",
      },
    ],
    site_name: "xtarter",
  },
  twitter: {
    handle: "@agstnsnathaniel",
    cardType: "summary_large_image",
  },
};

export default defaultSEOConfig;

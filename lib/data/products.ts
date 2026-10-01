export type ProductVisual =
  | "signal"
  | "location"
  | "compute"
  | "fleet"
  | "shield";

export type HubbleProduct = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  features: string[];
  visual: ProductVisual;
};

export const products: HubbleProduct[] = [
  {
    slug: "cellular-connectivity",
    name: "Cellular connectivity",
    shortDescription:
      "A network connection for devices that need to stay reachable over a mobile network.",
    description:
      "This feature covers how a Hubble module registers on a cellular network and keeps a data path available to the host device.",
    features: ["Network registration", "Data session", "Operator connectivity"],
    visual: "signal",
  },
  {
    slug: "gnss-positioning",
    name: "GNSS positioning",
    shortDescription:
      "Satellite positioning for products that need to report where a device is.",
    description:
      "This feature adds a location reading alongside the cellular connection, for devices that track movement or site presence.",
    features: ["Satellite fix", "Location reporting", "Time reference"],
    visual: "location",
  },
  {
    slug: "edge-processing",
    name: "Edge processing",
    shortDescription:
      "On-module processing so application logic can run close to the device.",
    description:
      "This feature is the processing capacity on the module, used when a product should run local logic without a separate application processor.",
    features: ["Local logic", "Host interface", "Low-power operation"],
    visual: "compute",
  },
  {
    slug: "device-management",
    name: "Device management",
    shortDescription:
      "Identity and update support for modules after they leave the factory.",
    description:
      "This feature covers identifying a deployed module and supporting a software update without a site visit.",
    features: ["Device identity", "Remote update", "Status reporting"],
    visual: "fleet",
  },
  {
    slug: "secure-connectivity",
    name: "Secure connectivity",
    shortDescription:
      "Protection for the data path between the module and the services it reaches.",
    description:
      "This feature covers the controls used to protect credentials and the connection leaving the device.",
    features: ["Encrypted link", "Credential storage", "Access control"],
    visual: "shield",
  },
];

export function findProduct(slug: string): HubbleProduct | undefined {
  return products.find((product) => product.slug === slug);
}

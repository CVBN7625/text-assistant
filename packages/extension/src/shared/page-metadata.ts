export type PageMetadata = {
  pageTitle?: string;
  pageUrl?: string;
};

export type TabMetadata = {
  title?: string;
  url?: string;
};

export function toPageMetadata(value?: PageMetadata | TabMetadata): PageMetadata {
  if (!value) {
    return {};
  }
  const page = value as PageMetadata;
  const tab = value as TabMetadata;
  return {
    pageTitle: page.pageTitle ?? tab.title,
    pageUrl: page.pageUrl ?? tab.url
  };
}

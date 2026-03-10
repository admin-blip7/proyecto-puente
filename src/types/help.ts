export type HelpRole = 'Admin' | 'Socio' | 'Cajero' | 'Cliente';

export interface HelpTourStep {
  target: string;
  title: string;
  description: string;
}

export interface HelpTour {
  id: string;
  title: string;
  module: string;
  steps: HelpTourStep[];
}

export interface HelpVideo {
  id: string;
  title: string;
  module: string;
  duration: string;
  url: string;
  transcript?: string;
  downloadableLabel?: string;
  downloadableUrl?: string;
}

export interface HelpCategory {
  id: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
  articleSlugs: string[];
}

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  module: string;
  description: string;
  tags: string[];
  roleHints: HelpRole[];
  intro: string;
  steps: string[];
  tips: string[];
  warnings: string[];
  related: string[];
  views: number;
  helpfulCount: number;
  lastUpdated: string;
  screenshotPlaceholders: string[];
  videoId?: string;
}

export interface HelpSearchResult {
  slug: string;
  title: string;
  description: string;
  category: string;
  module: string;
  score: number;
  tags: string[];
}

export interface HelpFeedbackState {
  articleSlug: string;
  voted: 'up' | 'down' | null;
  comment: string;
  suggestedImprovement: string;
}

export type Film = {
  slug: string;
  title: string;
  description: string;
  historic_context: string;
  aesthetic_critical_commentary: string;
  production_commentary: string;
  vimeo_url: string;
  date: string;
  place: string;
  author: string;
  geotag: string;
  tags: string;
  annotator_comments_optional?: string;
  assigned_to?: string;
  description_approved?: string;
  historic_context_approved?: string;
  aesthetic_critical_commentary_approved?: string;
  production_commentary_approved?: string;
  tags_approved?: string;
  annotator_comments_optional_approved?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

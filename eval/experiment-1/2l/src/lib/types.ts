export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  count?: number;
}

export interface BookmarkFormData {
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface BookmarkRow {
  id: number;
  url: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  tag_names: string | null;
}

export interface TagRow {
  id: number;
  name: string;
  count: number;
}

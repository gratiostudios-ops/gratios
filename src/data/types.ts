export type AssetKey = 'mail' | 'brief' | 'flight' | 'gym' | 'video' | 'avatar' | 'phone' | 'car' | 'skoda' | 'watch';
export type ImageReference = { asset: AssetKey; uri?: never } | { uri: string; asset?: never };
export type AgentIcon = 'flight' | 'mail' | 'gym' | 'video' | 'news';
export type TableText = string | { text: string; tone?: 'highlight' | 'muted' }[];
export type Action = { id: string; label: string; message: string };

export type ContentBlock =
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'numbered-list'; items: { id: string; text: string }[] }
  | {
      id: string;
      type: 'table';
      title: string;
      subtitle?: string;
      columns: { id: string; label?: string; align?: 'left' | 'right' }[];
      rows: { id: string; cells: TableText[] }[];
      previewRows?: number;
    }
  | { id: string; type: 'actions'; actions: Action[] };

export type Agent = {
  id: string;
  name: string;
  description: string;
  icon: AgentIcon;
  image: ImageReference;
  document: string;
};

export type Finding = {
  id: string;
  agentId: string;
  title: string;
  image: ImageReference;
  navigationIcon?: AgentIcon;
  navigationLabel?: string;
  blocks: ContentBlock[];
  suggestions: Action[];
};

export type Task = { id: string; kind: 'task' | 'calendar'; title: string; due?: string };
export type Snapshot = { tasks: Task[]; findings: Finding[] };
export type Reply = { text: string; actions?: Action[] };
export type SendRequest = { text: string; findingId: string | null };

export type FeedItem = {
  id: string;
  title: string;
  description: string;
  body: string;
  image: ImageReference;
  sections?: { id: string; title: string; paragraphs?: string[]; points?: string[] }[];
  links?: { id: string; label: string; url: string; caption?: string }[];
};
export type FeedGroup = { id: string; dateLabel: string; items: FeedItem[] };
export type Profile = {
  name: string;
  email: string;
  dob: string;
  avatar: ImageReference;
  interests: string[];
  preferences: string[];
};

// A backend can implement this interface and push complete snapshots through subscribe.
// Components never choose an agent from the registry when findings are absent.
export interface DataSource {
  load(): Promise<Snapshot>;
  subscribe?(onSnapshot: (snapshot: Snapshot) => void): () => void;
  sendMessage(request: SendRequest): Promise<Reply>;
  completeTask(taskId: string): Promise<void>;
}

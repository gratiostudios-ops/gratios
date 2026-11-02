import type { StickerKey } from '../agent-icons';
export type AssetKey = StickerKey |  'general-sun' | 'general-moon' | 'mail' | 'brief' | 'flight' | 'gym' | 'video' | 'avatar' | 'phone' | 'car' | 'skoda' | 'watch' | 'calendar';
export type ImageReference = { asset: AssetKey; uri?: never } | { uri: string; mediaId?: string; asset?: never } | { mediaId: string; uri?: string; asset?: never };
export type AgentIcon = 'general' | 'flight' | 'mail' | 'gym' | 'video' | 'news' | 'brief' | 'calendar' | 'date' | 'greeting';
export type TableText = string | { text: string; tone?: 'highlight' | 'muted' }[];
export type Action = { id: string; label: string; message: string };

export type ContentBlock =
  | {id:string;type:'email-link';messageId:string;label?:string;url?:string}
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'numbered-list'; items: { id: string; text: string }[] }
  | {
      id: string;
      type: 'table';
      title: string;
      subtitle?: string;
      columns: { id: string; label?: string; align?: 'left' | 'right' }[];
      rows: { id: string; cells: TableText[]; agenda?: { id: string; kind: 'task' | 'calendar'; completed: boolean } }[];
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
  enabled?: boolean;
  connectorIds?: import('./connection-options').ConnectionId[];
  missingSetup?: string[];
};

export type Finding = {
  submissionId?: string | null;
  id: string;
  agentId: string;
  title: string;
  image: ImageReference;
  navigationIcon?: AgentIcon;
  navigationLabel?: string;
  blocks: ContentBlock[];
  suggestions: Action[];
  firstSeenAt?: string | null;
  expiresAt?: string | null;
};

export type Task = { id: string; kind: 'task' | 'calendar'; title: string; due?: string; dueAt?: string; dueDate?: string; endsAt?: string };
export type AgendaItem = Omit<Task, 'dueAt'> & { dueAt?: string | null; completed: boolean; allDay: boolean };
export type Snapshot = { featuredFindingId?: string | null; tasks: Task[]; findings: Finding[] };
export type Reply = { version?: 1; text: string; highlights?: string[]; actions?: Action[] };
export type SendRequest = { text: string; findingId: string | null; agentId?: string };

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

export type SavedMessage = { replies?: { id: string; reply: Reply }[]; id: string; text: string; reply?: Reply; status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'; error?: string };
export type MobileData = {
  notificationFailures?: { id: string }[];
  agendaError?: string;
  agendaTasksError?: string;
  agendaItems?: AgendaItem[];
  snapshot: Snapshot; agents: Agent[]; profile: Profile; feed: FeedGroup[]; documents: Record<string, string>;
  conversations: { id: string; findingId: string | null; agentId?: string; role?: string; history?: { id: string; role: 'user' | 'assistant'; text: string; reply?: Reply; createdAt: string }[]; messages: SavedMessage[] }[];
};

// A backend can implement this interface and push complete snapshots through subscribe.
// Components never choose an agent from the registry when findings are absent.
export interface DataSource {
  load(): Promise<Snapshot>;
  subscribe?(onSnapshot: (snapshot: Snapshot) => void): () => void;
  subscribeChat?(onConversations: (conversations: MobileData['conversations']) => void): () => void;
  sendMessage(request: SendRequest, onAccepted?: (messageId: string, submissionId?: string) => void): Promise<Reply>;
  cancelMessage?(request: SendRequest): Promise<{ cardIds: string[]; submissionId?: string }>;
  completeTask(taskId: string, kind?: Task['kind']): Promise<void>;
  restoreTask(task: Task): Promise<void>;
  loadMobile?(): Promise<MobileData>;
  saveDocument?(id: string, text: string): Promise<void>;
  markCardSeen?(id: string): Promise<{ firstSeenAt: string; expiresAt: string }>;
  setForeground?(foreground: boolean): void;
  dispose?(): void;
}

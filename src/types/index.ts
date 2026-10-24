export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  cover_url: string | null;
  visibility: 'public' | 'private';
  join_policy: 'open' | 'request';
  invite_code: string;
  theme_color: string;
  passphrase: string | null;
  discoverable: boolean;
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'banned';
  created_at: string;
  nda_accepted_at: string | null;
  profiles?: Profile;
}

export interface Track {
  id: string;
  room_id: string;
  uploaded_by: string;
  title: string;
  file_path: string;
  duration_seconds: number;
  cover_url: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  track_id: string;
  user_id: string;
  text: string;
  timestamp_seconds: number | null;
  parent_id: string | null;
  gif_url: string | null;
  sticker_id: string | null;
  comment_media: string | null;
  created_at: string;
  profiles?: Profile;
  replies?: Comment[];
}

export interface Invitation {
  id: string;
  room_id: string;
  created_by: string;
  token: string;
  used: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Poll {
  id: string;
  room_id: string;
  created_by: string;
  question: string;
  type: 'poll' | 'survey';
  multiple_choice: boolean;
  closes_at: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  position: number;
  created_at: string;
  voteCount?: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

export interface GameSession {
  id: string;
  room_id: string;
  created_by: string;
  game_type: 'complete_line' | 'timer_question' | 'four_pics' | 'mixed' | 'anagram';
  status: 'waiting' | 'active' | 'ended';
  duration_seconds: number;
  started_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  winner_id: string | null;
  repeat_questions: boolean;
  is_permanent: boolean;
  title: string;
  play_requirement: number;
  created_at: string;
  profiles?: Profile;
}

export interface GameQuestion {
  id: string;
  session_id: string;
  question: string;
  correct_answer: string;
  choices: string[];
  image_urls: string[];
  question_type: string;
  position: number;
  created_at: string;
}

export interface GamePlay {
  id: string;
  game_id: string;
  room_id: string;
  user_id: string;
  status: 'in_progress' | 'completed';
  started_at: string;
  ends_at: string | null;
  completed_at: string | null;
  total_points: number;
  correct_count: number;
  avg_time_ms: number;
  play_date: string;
  created_at: string;
}

export interface GameSessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_id: string;
  answer: string;
  time_ms: number;
  is_correct: boolean;
  points: number;
  created_at: string;
}

export interface GameSessionScore {
  id: string;
  session_id: string;
  room_id: string;
  user_id: string;
  total_points: number;
  correct_count: number;
  avg_time_ms: number;
  created_at: string;
  profiles?: Profile;
}

export interface JamSession {
  id: string;
  room_id: string;
  host_id: string;
  status: 'active' | 'ended';
  current_track_id: string | null;
  position_seconds: number;
  is_playing: boolean;
  queue_track_ids: string[];
  started_at: string;
  ended_at: string | null;
}

export interface JamParticipant {
  id: string;
  jam_id: string;
  user_id: string;
  joined_at: string;
  last_seen_at: string;
  profiles?: Profile;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  video_path: string | null;
  video_url: string | null;
  status: 'draft' | 'active' | 'paused' | 'expired';
  trigger_type: string;
  trigger_types: string[];
  trigger_config: Record<string, unknown>;
  starts_at: string | null;
  ends_at: string | null;
  show_to_premium: boolean;
  cta_url: string | null;
  cta_label: string;
  close_after_seconds: number;
  skip_duration_seconds: number;
  impressions: number;
  created_at: string;
}

export interface AdImpression {
  id: string;
  ad_id: string;
  user_id: string;
  room_id: string | null;
  shown_at: string;
}

export interface PremiumFeature {
  feature: string;
  is_premium: boolean;
  label: string;
  description: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  payment_ref: string;
  payment_amount: number;
  receipt_path: string | null;
  receipt_status: 'pending' | 'approved' | 'rejected';
  granted_at: string | null;
  expires_at: string | null;
  created_at: string;
  webhook_status: string | null;
}

export interface PaymentDetails {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  instructions: string;
  is_active: boolean;
  custom_heading: string;
  custom_subtext: string;
  footer_note: string;
}

export interface AppSettings {
  id: number;
  max_rooms_free: number;
  max_rooms_premium: number;
  premium_popup_copy: {
    title: string;
    body: string;
    cta_label: string;
  };
  premium_price: number;
  premium_currency: string;
  payment_webhook_url: string | null;
  discovery_enabled: boolean;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string;
  action_type: string;
  description: string;
  entity_type: string;
  entity_id: string | null;
  room_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type NotificationType =
  | 'comment_on_track'
  | 'reply_to_comment'
  | 'jam_started'
  | 'poll_created'
  | 'game_created'
  | 'member_joined'
  | 'join_request'
  | 'premium_approved'
  | 'premium_rejected'
  | 'mention'
  | 'chat_message'
  | 'announcement';

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  room_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile | null;
  room?: Room | null;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  text: string;
  shared_track_id: string | null;
  reply_to: string | null;
  media_url: string | null;
  media_type: string | null;
  gif_url: string | null;
  created_at: string;
  profiles?: Profile;
  shared_track?: Track | null;
  reply_to_message?: RoomMessage | null;
}

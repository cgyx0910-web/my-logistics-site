export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      site_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      auction_products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          points_required: number;
          image_url: string | null;
          images: string[] | null;
          stock: number;
          tag: string | null;
          button_text: string | null;
          sort_order: number;
          direct_buy_points: number | null;
          shipping_fee: number | null;
          fixed_shipping_fee: number | null;
          is_auction: boolean;
          end_time: string | null;
          winning_bid_id: string | null;
          settled_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          points_required: number;
          image_url?: string | null;
          images?: string[] | null;
          stock?: number;
          tag?: string | null;
          button_text?: string | null;
          sort_order?: number;
          direct_buy_points?: number | null;
          shipping_fee?: number | null;
          fixed_shipping_fee?: number | null;
          is_auction?: boolean;
          end_time?: string | null;
          winning_bid_id?: string | null;
          settled_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auction_products"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          points: number;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; email?: string | null; points?: number; full_name?: string | null; avatar_url?: string | null; role?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      order_tracking_logs: {
        Row: { id: string; order_id: string; status_title: string; location: string | null; description: string | null; created_at: string };
        Insert: { id?: string; order_id: string; status_title: string; location?: string | null; description?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["order_tracking_logs"]["Insert"]>;
      };
      shipping_orders: {
        Row: {
          id: string;
          user_id: string;
          tracking_number: string | null;
          status: string;
          shipping_fee: number;
          fixed_shipping_fee: number | null;
          points_awarded: number;
          payment_proof_url: string | null;
          domestic_tracking_number: string | null;
          cargo_details: string | null;
          sender_name: string | null;
          sender_phone: string | null;
          sender_address: string | null;
          receiver_name: string | null;
          receiver_phone: string | null;
          receiver_address: string | null;
          source_type: string;
          order_type: string;
          auction_product_id: string | null;
          auction_bid_id: string | null;
          cancel_requested_by: string | null;
          cancel_requested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; user_id: string; tracking_number?: string | null; status?: string; shipping_fee?: number; fixed_shipping_fee?: number | null; points_awarded?: number; payment_proof_url?: string | null; domestic_tracking_number?: string | null; cargo_details?: string | null; sender_name?: string | null; sender_phone?: string | null; sender_address?: string | null; receiver_name?: string | null; receiver_phone?: string | null; receiver_address?: string | null; source_type?: string; order_type?: string; auction_product_id?: string | null; auction_bid_id?: string | null; cancel_requested_by?: string | null; cancel_requested_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["shipping_orders"]["Insert"]>;
      };
      sign_ins: {
        Row: { user_id: string; sign_in_date: string; created_at: string };
        Insert: { user_id: string; sign_in_date?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["sign_ins"]["Insert"]>;
      };
      auction_bids: {
        Row: { id: string; product_id: string; user_id: string; bid_points: number; created_at: string };
        Insert: { id?: string; product_id: string; user_id: string; bid_points: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["auction_bids"]["Insert"]>;
      };
      point_history: {
        Row: { id: string; user_id: string; amount: number; type: string; ref_id: string | null; created_at: string };
        Insert: { id?: string; user_id: string; amount: number; type: string; ref_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["point_history"]["Insert"]>;
      };
      user_notifications: {
        Row: { id: string; user_id: string; title: string; body: string | null; read_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; title: string; body?: string | null; read_at?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_notifications"]["Insert"]>;
      };
      logistics_stories: {
        Row: {
          id: string;
          title: string;
          description: string;
          content: string | null;
          tags: string[];
          likes: number;
          reads_display: string | null;
          image_url: string | null;
          placeholder_icon: string | null;
          placeholder_bg: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          content?: string | null;
          tags?: string[] | null;
          likes?: number;
          reads_display?: string | null;
          image_url?: string | null;
          placeholder_icon?: string | null;
          placeholder_bg?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["logistics_stories"]["Insert"]>;
      };
      shipping_rates: {
        Row: {
          id: string;
          country: string;
          shipping_method: string;
          unit_price: number;
          min_weight: number;
          max_weight: number | null;
          currency: string;
          delivery_days: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          country: string;
          shipping_method: string;
          unit_price: number;
          min_weight?: number;
          max_weight?: number | null;
          currency?: string;
          delivery_days?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipping_rates"]["Insert"]>;
      };
      shipping_rate_logs: {
        Row: {
          id: string;
          operator_id: string | null;
          operated_at: string;
          action: string;
          countries: string[] | null;
          file_backup: string | null;
          summary: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operator_id?: string | null;
          operated_at?: string;
          action: string;
          countries?: string[] | null;
          file_backup?: string | null;
          summary?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipping_rate_logs"]["Insert"]>;
      };
    };
    Functions: {
      add_user_points: {
        Args: { p_user_id: string; p_points: number };
        Returns: void;
      };
      deduct_user_points: {
        Args: { p_user_id: string; p_points: number; p_type: string; p_ref_id?: string | null };
        Returns: void;
      };
      add_user_points_with_history: {
        Args: { p_user_id: string; p_points: number; p_type: string; p_ref_id?: string | null };
        Returns: void;
      };
      settle_auction_product: {
        Args: { p_product_id: string };
        Returns: string;
      };
      get_tracking_by_number: {
        Args: { p_tracking_number: string };
        Returns: { found: boolean; order?: { id: string; tracking_number: string; status: string }; logs?: unknown[] };
      };
    };
  };
}

export type SiteSettingRow = Database["public"]["Tables"]["site_settings"]["Row"];
export type AuctionProductRow = Database["public"]["Tables"]["auction_products"]["Row"];
export type LogisticsStoryRow = Database["public"]["Tables"]["logistics_stories"]["Row"];
export type ShippingRateRow = Database["public"]["Tables"]["shipping_rates"]["Row"];
export type ShippingRateLogRow = Database["public"]["Tables"]["shipping_rate_logs"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
/** Auth user.id 用于 profiles 表查询时的类型断言，避免 Postgrest 严格类型报错 */
export type ProfileId = ProfileRow["id"];
export type ShippingOrderRow = Database["public"]["Tables"]["shipping_orders"]["Row"];
export type SignInRow = Database["public"]["Tables"]["sign_ins"]["Row"];
export type AuctionBidRow = Database["public"]["Tables"]["auction_bids"]["Row"];
export type PointHistoryRow = Database["public"]["Tables"]["point_history"]["Row"];
export type OrderTrackingLogRow = Database["public"]["Tables"]["order_tracking_logs"]["Row"];
export type UserNotificationRow = Database["public"]["Tables"]["user_notifications"]["Row"];

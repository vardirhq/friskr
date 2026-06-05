// Hand-written to match migrations 0001–0004. After `supabase db reset`, regenerate:
//   supabase gen types typescript --local > src/lib/database.types.ts

export type Urgency = 'fresh' | 'soon' | 'expired';
export type StockStatus = 'in_stock' | 'used_up' | 'discarded';
export type LocationId = 'kjoleskap' | 'fryser' | 'spiskammer' | (string & {});
export type CategoryId =
  | 'meieri' | 'kjott' | 'fisk' | 'frukt' | 'brod'
  | 'palegg' | 'ferdig' | 'drikke' | 'snacks' | 'annet';

type _CategoryRow = { id: CategoryId; label: string; icon: string; hue: number; sort: number };
type _CategoryInsert = { id: CategoryId; label: string; icon: string; hue?: number; sort?: number };
type _LocationRow = { id: string; label: string; icon: string; hue: number; sort: number; freezer: boolean; household_id: string | null };
type _LocationInsert = { id: string; label: string; icon: string; hue?: number; sort?: number; freezer?: boolean; household_id?: string | null };
type _HouseholdRow = { id: string; name: string; invite_code: string; created_at: string };
type _HouseholdInsert = { id?: string; name: string; invite_code?: string };
type _MemberRow = { id: string; household_id: string; user_id: string; role: 'owner' | 'member'; display_name: string | null; color_hue: number | null; joined_at: string };
type _MemberInsert = { id?: string; household_id: string; user_id: string; role?: 'owner' | 'member'; display_name?: string | null; color_hue?: number | null };
type _ProductRow = { id: string; household_id: string | null; name: string; brand: string; category_id: CategoryId; default_shelf_days: number | null; barcode: string | null; created_at: string };
type _ProductInsert = { id?: string; household_id?: string | null; name: string; brand?: string; category_id: CategoryId; default_shelf_days?: number | null; barcode?: string | null };
type _StockRow = { id: string; household_id: string; product_id: string; location_id: string; quantity: number; expiry_date: string | null; frozen: boolean; best_for_date: string | null; note: string | null; price_nok: number | null; status: StockStatus; added_by: string | null; created_at: string; resolved_at: string | null };
type _StockInsert = { id?: string; household_id: string; product_id: string; location_id: string; quantity?: number; expiry_date?: string | null; frozen?: boolean; best_for_date?: string | null; note?: string | null; price_nok?: number | null; status?: StockStatus; added_by?: string | null };

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: _CategoryRow;
        Insert: _CategoryInsert;
        Update: Partial<_CategoryInsert>;
        Relationships: [];
      };
      locations: {
        Row: _LocationRow;
        Insert: _LocationInsert;
        Update: Partial<_LocationInsert>;
        Relationships: [];
      };
      households: {
        Row: _HouseholdRow;
        Insert: _HouseholdInsert;
        Update: Partial<_HouseholdInsert>;
        Relationships: [];
      };
      household_members: {
        Row: _MemberRow;
        Insert: _MemberInsert;
        Update: Partial<_MemberInsert>;
        Relationships: [];
      };
      products: {
        Row: _ProductRow;
        Insert: _ProductInsert;
        Update: Partial<_ProductInsert>;
        Relationships: [];
      };
      stock_items: {
        Row: _StockRow;
        Insert: _StockInsert;
        Update: Partial<_StockInsert>;
        Relationships: [];
      };
    };
    Views: {
      stock_status: {
        Row: {
          id: string; household_id: string; product_id: string; location_id: string;
          quantity: number; expiry_date: string | null; frozen: boolean;
          best_for_date: string | null; note: string | null; price_nok: number | null;
          status: StockStatus; added_by: string | null; created_at: string; resolved_at: string | null;
          location_freezer: boolean;
          days_left: number | null; best_for_days_left: number | null; urgency: Urgency | StockStatus;
          product_name: string; product_brand: string; category_id: CategoryId;
          category_label: string; category_hue: number; location_label: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_household: {
        Args: { p_name: string; p_display_name?: string };
        Returns: _HouseholdRow;
      };
      join_household: {
        Args: { p_code: string; p_display_name?: string };
        Returns: _HouseholdRow;
      };
      seed_demo_household: { Args: { p_user: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

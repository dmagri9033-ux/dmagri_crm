export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      permissions: {
        Row: {
          id: string;
          code: string;
          module: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          module: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          module?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string;
          role_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          display_name: string;
          email: string;
          role_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string;
          email?: string;
          role_id?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          mobile: string;
          mobile_normalized: string;
          customer_type: string | null;
          primary_product_id: string | null;
          product_purchased: boolean;
          follow_up_required: boolean;
          notes: string | null;
          assigned_user_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          mobile: string;
          mobile_normalized?: string;
          customer_type?: string | null;
          primary_product_id?: string | null;
          product_purchased?: boolean;
          follow_up_required?: boolean;
          notes?: string | null;
          assigned_user_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          mobile?: string;
          mobile_normalized?: string;
          customer_type?: string | null;
          primary_product_id?: string | null;
          product_purchased?: boolean;
          follow_up_required?: boolean;
          notes?: string | null;
          assigned_user_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_primary_product_id_fkey";
            columns: ["primary_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiries: {
        Row: {
          id: string;
          inquiry_date: string;
          customer_id: string;
          customer_type: string | null;
          product_id: string;
          product_purchased: boolean;
          remarks: string | null;
          assigned_user_id: string | null;
          created_by: string;
          customer_name_snapshot: string | null;
          mobile_snapshot: string | null;
          product_name_snapshot: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          inquiry_date: string;
          customer_id: string;
          customer_type?: string | null;
          product_id: string;
          product_purchased?: boolean;
          remarks?: string | null;
          assigned_user_id?: string | null;
          created_by: string;
          customer_name_snapshot?: string | null;
          mobile_snapshot?: string | null;
          product_name_snapshot?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          inquiry_date?: string;
          customer_id?: string;
          customer_type?: string | null;
          product_id?: string;
          product_purchased?: boolean;
          remarks?: string | null;
          assigned_user_id?: string | null;
          created_by?: string;
          customer_name_snapshot?: string | null;
          mobile_snapshot?: string | null;
          product_name_snapshot?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inquiries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inquiries_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      followups: {
        Row: {
          id: string;
          customer_id: string;
          inquiry_id: string | null;
          followup_date: string;
          notes: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          inquiry_id?: string | null;
          followup_date: string;
          notes: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          inquiry_id?: string | null;
          followup_date?: string;
          notes?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "followups_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "followups_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "inquiries";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          id: string;
          title: string;
          customer_id: string;
          inquiry_id: string | null;
          remind_at: string;
          notes: string | null;
          assigned_user_id: string;
          completed_at: string | null;
          snoozed_until: string | null;
          cancelled_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          customer_id: string;
          inquiry_id?: string | null;
          remind_at: string;
          notes?: string | null;
          assigned_user_id: string;
          completed_at?: string | null;
          snoozed_until?: string | null;
          cancelled_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          customer_id?: string;
          inquiry_id?: string | null;
          remind_at?: string;
          notes?: string | null;
          assigned_user_id?: string;
          completed_at?: string | null;
          snoozed_until?: string | null;
          cancelled_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_product_purchases: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          inquiry_id: string | null;
          purchased_at: string | null;
          is_purchased: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          product_id: string;
          inquiry_id?: string | null;
          purchased_at?: string | null;
          is_purchased?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          product_id?: string;
          inquiry_id?: string | null;
          purchased_at?: string | null;
          is_purchased?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_notes: {
        Row: {
          id: string;
          customer_id: string;
          body: string;
          created_by: string;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          body: string;
          created_by: string;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          body?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          reminder_id: string | null;
          kind: string;
          title: string;
          body: string | null;
          dedupe_key: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_id?: string | null;
          kind: string;
          title: string;
          body?: string | null;
          dedupe_key: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reminder_id?: string | null;
          kind?: string;
          title?: string;
          body?: string | null;
          dedupe_key?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          module: string;
          entity_type: string;
          entity_id: string;
          customer_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          module: string;
          entity_type: string;
          entity_id: string;
          customer_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          module?: string;
          entity_type?: string;
          entity_id?: string;
          customer_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          bucket: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          bucket: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          bucket?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          uploaded_by?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          id: string;
          module: string;
          file_name: string;
          status: string;
          total_rows: number;
          valid_rows: number;
          error_rows: number;
          created_by: string;
          created_at: string;
          committed_at: string | null;
          summary: Json;
        };
        Insert: {
          id?: string;
          module: string;
          file_name: string;
          status?: string;
          total_rows?: number;
          valid_rows?: number;
          error_rows?: number;
          created_by: string;
          created_at?: string;
          committed_at?: string | null;
          summary?: Json;
        };
        Update: {
          id?: string;
          module?: string;
          file_name?: string;
          status?: string;
          total_rows?: number;
          valid_rows?: number;
          error_rows?: number;
          created_by?: string;
          created_at?: string;
          committed_at?: string | null;
          summary?: Json;
        };
        Relationships: [];
      };
      import_batch_rows: {
        Row: {
          id: string;
          batch_id: string;
          row_number: number;
          payload: Json;
          is_valid: boolean;
          errors: Json;
          is_duplicate: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          row_number: number;
          payload?: Json;
          is_valid?: boolean;
          errors?: Json;
          is_duplicate?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          row_number?: number;
          payload?: Json;
          is_valid?: boolean;
          errors?: Json;
          is_duplicate?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_batch_rows_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_active_profile: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      normalize_mobile_digits: {
        Args: { raw: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

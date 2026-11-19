
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "instaladores": {
                  Row: {
                    "activo": boolean,"certificacion": string | null,"created_at": string,"email": string,"especialidad": string | null,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_equipo"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"certificacion"?: string | null,"created_at"?: string,"email": string,"especialidad"?: string | null,"id"?: string,"nombre": string,"rol"?: Database["public"]['Enums']["rol_equipo"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activo"?: boolean,"certificacion"?: string | null,"created_at"?: string,"email"?: string,"especialidad"?: string | null,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_equipo"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"materiales": {
                  Row: {
                    "costo_unitario": number,"created_at": string,"id": string,"nombre": string,"stock": number,"tipo": Database["public"]['Enums']["tipo_material"],"unidad": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "costo_unitario": number,"created_at"?: string,"id"?: string,"nombre": string,"stock"?: number,"tipo": Database["public"]['Enums']["tipo_material"],"unidad": string,"updated_at"?: string
                  }
                  Update: {
                    "costo_unitario"?: number,"created_at"?: string,"id"?: string,"nombre"?: string,"stock"?: number,"tipo"?: Database["public"]['Enums']["tipo_material"],"unidad"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"proyecto_materiales": {
                  Row: {
                    "cantidad": number,"material_id": string,"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"material_id": string,"proyecto_id": string
                  }
                  Update: {
                    "cantidad"?: number,"material_id"?: string,"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proyecto_materiales_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materiales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proyecto_materiales_proyecto_id_fkey"
      columns: ["proyecto_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id"]
    }
                  ]
                },"proyectos": {
                  Row: {
                    "capacidad_kwp": number,"ciudad": string,"cliente": string,"created_at": string,"created_by": string | null,"direccion": string,"estado": Database["public"]['Enums']["estado_proyecto"],"fecha_fin": string | null,"fecha_inicio": string,"id": string,"instalador_id": string | null,"nombre": string,"numero_paneles": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capacidad_kwp": number,"ciudad": string,"cliente": string,"created_at"?: string,"created_by"?: string | null,"direccion": string,"estado"?: Database["public"]['Enums']["estado_proyecto"],"fecha_fin"?: string | null,"fecha_inicio": string,"id"?: string,"instalador_id"?: string | null,"nombre": string,"numero_paneles": number,"updated_at"?: string
                  }
                  Update: {
                    "capacidad_kwp"?: number,"ciudad"?: string,"cliente"?: string,"created_at"?: string,"created_by"?: string | null,"direccion"?: string,"estado"?: Database["public"]['Enums']["estado_proyecto"],"fecha_fin"?: string | null,"fecha_inicio"?: string,"id"?: string,"instalador_id"?: string | null,"nombre"?: string,"numero_paneles"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proyectos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "instaladores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proyectos_instalador_id_fkey"
      columns: ["instalador_id"]
isOneToOne: false
      referencedRelation: "instaladores"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "resumen_proyectos_por_estado": {
                  Row: {
                    "estado": Database["public"]['Enums']["estado_proyecto"] | null,"total": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "estado_proyecto": "pendiente"|"en_progreso"|"completado","rol_equipo": "instalador"|"coordinador","tipo_material": "panel"|"inversor"|"estructura"|"cableado"|"proteccion"|"bateria"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "estado_proyecto": ["pendiente", "en_progreso", "completado"],"rol_equipo": ["instalador", "coordinador"],"tipo_material": ["panel", "inversor", "estructura", "cableado", "proteccion", "bateria"]
          }
        }
} as const

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zvygxguwnpzvxdptiiwz.supabase.co"
const supabaseKey = "sb_publishable_Qovt10ambppH7TgLB5YPvw_bL6imbFo"

export const supabase = createClient(supabaseUrl, supabaseKey)
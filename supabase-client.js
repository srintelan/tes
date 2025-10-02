import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://vqmhrdjniazlssyywcbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbWhyZGpuaWF6bHNzeXl3Y2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTU4NzksImV4cCI6MjA3NDk5MTg3OX0.wevg4SsCrhb4S_MU03N0-h4AtvMGE0Nz5Kt6pzB_S-o';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getCurrentUser() {
    const userId = sessionStorage.getItem('userId');
    if (!userId) return null;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    return error ? null : data;
}

export async function loginUser(username, password) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

    if (error || !data) {
        return { success: false, error: 'Username atau password salah' };
    }

    sessionStorage.setItem('userId', data.id);
    sessionStorage.setItem('username', data.username);

    await markUserOnline(data.id, data.username);

    return { success: true, user: data };
}

export async function signupUser(nik, username, email, password) {
    const { data: existingUser } = await supabase
        .from('users')
        .select('username, email, nik')
        .or(`username.eq.${username},email.eq.${email},nik.eq.${nik}`)
        .maybeSingle();

    if (existingUser) {
        if (existingUser.username === username) {
            return { success: false, error: 'Username sudah digunakan' };
        }
        if (existingUser.email === email) {
            return { success: false, error: 'Email sudah digunakan' };
        }
        if (existingUser.nik === nik) {
            return { success: false, error: 'NIK sudah digunakan' };
        }
    }

    const { data, error } = await supabase
        .from('users')
        .insert([{ nik, username, email, password }])
        .select()
        .single();

    if (error) {
        return { success: false, error: 'Gagal membuat akun. Silakan coba lagi.' };
    }

    return { success: true, user: data };
}

export async function logoutUser() {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
        await supabase
            .from('online_users')
            .delete()
            .eq('user_id', userId);
    }

    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('username');

    window.location.href = '/login.html';
}

export async function markUserOnline(userId, username) {
    const { data: existing } = await supabase
        .from('online_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (existing) {
        await supabase
            .from('online_users')
            .update({ last_seen: new Date().toISOString() })
            .eq('user_id', userId);
    } else {
        await supabase
            .from('online_users')
            .insert([{ user_id: userId, username }]);
    }
}

export async function updateUserActivity() {
    const userId = sessionStorage.getItem('userId');
    if (!userId) return;

    const username = sessionStorage.getItem('username');
    await markUserOnline(userId, username);
}

export async function getOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('online_users')
        .select('username, last_seen')
        .gte('last_seen', fiveMinutesAgo)
        .order('username');

    return error ? [] : data;
}

export function isAuthenticated() {
    return sessionStorage.getItem('userId') !== null;
}

export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

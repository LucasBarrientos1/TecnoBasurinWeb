// Cliente mínimo para hablar con el backend. Se carga antes de cart.js en todas las páginas.
async function api(ruta, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = sessionStorage.getItem('token');
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try {
        res = await fetch('/api' + ruta, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) {
        throw new Error('No se pudo conectar con el servidor.');
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && auth) { sessionStorage.clear(); location.href = 'login.html'; }
    if (!res.ok) throw new Error(data.error || 'Error inesperado.');
    return data;
}

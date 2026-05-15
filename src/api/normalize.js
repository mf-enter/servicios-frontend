export function listFromResponse(response) {
	const payload = response?.data;
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	if (Array.isArray(payload?.results)) return payload.results;
	return [];
}
export function itemFromResponse(response) {
	const payload = response?.data;
	if (payload?.data && !Array.isArray(payload.data)) return payload.data;
	return payload;
}
export function apiErrorMessage(error) {
 	const status = error?.response?.status;
 	const backendMessage = error?.response?.data?.message || error?.response?.data?.error || null;

 	if (status === 403) return backendMessage ? `${backendMessage} (403 - Acceso denegado)` : "Acción no permitida (403).";
 	if (status === 409) return backendMessage ? `${backendMessage} (409 - Conflicto de estado)` : "Transición inválida o conflicto (409).";
 	if (status === 404) return backendMessage ? `${backendMessage} (404 - No encontrado)` : "Recurso no encontrado (404).";

 	return backendMessage || error?.message || "No se pudo cargar la información";
}
const dataServiceUrl = import.meta.env.VITE_DATA_SERVICE_URL;

if (!dataServiceUrl) {
    console.error("VITE_DATA_SERVICE_URL could not load well");
}

export const DATA_SERVICE_URL = (dataServiceUrl || '').replace(/\/$/, '');

export const getApiUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${DATA_SERVICE_URL}${normalizedPath}`;
};

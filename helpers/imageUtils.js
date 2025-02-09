function buildImageUrl(path) {
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return path ? `${baseUrl}${path}` : null;
}

module.exports = { buildImageUrl };